"""
Media Pipeline - Complete media processing for images, videos, and audio
Handles metadata extraction, compression, embeddings, and storage
"""
import os
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List, Union
from datetime import datetime
import json
import subprocess
import tempfile

# Image processing
from PIL import Image
import piexif

# Register HEIC/HEIF support
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    print("✅ HEIC/HEIF support enabled")
except ImportError:
    print("⚠️ pillow-heif not installed - HEIC/HEIF files won't be supported")
except Exception as e:
    print(f"⚠️ Failed to register HEIC support: {e}")

# Video/Audio processing
import ffmpeg
import cv2

# ML/AI
import numpy as np
import torch
import clip

# Storage
from config import Config
from storage_s3 import S3Storage
from storage_db import get_db_storage
from storage_pinecone import PineconeStorage


# ============================================================================
# METADATA EXTRACTOR
# ============================================================================

class MetadataExtractor:
    """Extract metadata from various media types"""
    
    @staticmethod
    def extract_image_metadata(file_path: str) -> Dict[str, Any]:
        """
        Extract metadata from image files
        
        Args:
            file_path: Path to image file
            
        Returns:
            Dictionary containing image metadata
        """
        file_ext = os.path.splitext(file_path)[1].lower()
        metadata = {
            'type': 'image',
            'file_type': 'image',
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': file_ext,
            'extension': file_ext,
            'file_path': file_path,
            'extracted_at': datetime.utcnow().isoformat()
        }
        
        try:
            with Image.open(file_path) as img:
                metadata.update({
                    'format': img.format,
                    'mode': img.mode,
                    'width': img.width,
                    'height': img.height,
                    'resolution': f"{img.width}x{img.height}",
                    'aspect_ratio': round(img.width / img.height, 2) if img.height > 0 else None,
                })
                
                # Extract EXIF data
                exif_data = {}
                if hasattr(img, '_getexif') and img._getexif():
                    exif = img._getexif()
                    if exif:
                        for tag_id, value in exif.items():
                            tag = piexif.TAGS.get(tag_id, tag_id)
                            exif_data[str(tag)] = str(value)
                
                # Try alternative EXIF extraction
                if 'exif' in img.info:
                    try:
                        exif_dict = piexif.load(img.info['exif'])
                        for ifd in exif_dict:
                            if ifd == "thumbnail":
                                continue
                            for tag in exif_dict[ifd]:
                                tag_name = piexif.TAGS[ifd][tag]["name"]
                                value = exif_dict[ifd][tag]
                                exif_data[tag_name] = str(value) if not isinstance(value, bytes) else "binary_data"
                    except Exception:
                        pass
                
                if exif_data:
                    metadata['exif'] = exif_data
                    
                    # Extract common EXIF fields
                    if 'DateTime' in exif_data:
                        metadata['date_taken'] = exif_data['DateTime']
                    if 'Make' in exif_data:
                        metadata['camera_make'] = exif_data['Make']
                    if 'Model' in exif_data:
                        metadata['camera_model'] = exif_data['Model']
                    if 'Orientation' in exif_data:
                        metadata['orientation'] = exif_data['Orientation']
                    if 'GPSLatitude' in exif_data and 'GPSLongitude' in exif_data:
                        metadata['gps_coordinates'] = {
                            'latitude': exif_data.get('GPSLatitude'),
                            'longitude': exif_data.get('GPSLongitude')
                        }
                
        except Exception as e:
            metadata['error'] = f"Error extracting image metadata: {str(e)}"
        
        return metadata
    
    @staticmethod
    def extract_video_metadata(file_path: str) -> Dict[str, Any]:
        """
        Extract metadata from video files
        
        Args:
            file_path: Path to video file
            
        Returns:
            Dictionary containing video metadata
        """
        file_ext = os.path.splitext(file_path)[1].lower()
        metadata = {
            'type': 'video',
            'file_type': 'video',
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': file_ext,
            'extension': file_ext,
            'file_path': file_path,
            'extracted_at': datetime.utcnow().isoformat()
        }
        
        try:
            # Use ffprobe to get detailed metadata
            probe = ffmpeg.probe(file_path)
            
            # General format info
            format_info = probe.get('format', {})
            metadata.update({
                'format': format_info.get('format_name'),
                'format_long_name': format_info.get('format_long_name'),
                'duration': float(format_info.get('duration', 0)),
                'bit_rate': int(format_info.get('bit_rate', 0)),
                'size': int(format_info.get('size', 0)),
            })
            
            # Stream information
            video_streams = [s for s in probe.get('streams', []) if s.get('codec_type') == 'video']
            audio_streams = [s for s in probe.get('streams', []) if s.get('codec_type') == 'audio']
            
            if video_streams:
                video_stream = video_streams[0]
                metadata.update({
                    'video_codec': video_stream.get('codec_name'),
                    'video_codec_long': video_stream.get('codec_long_name'),
                    'width': int(video_stream.get('width', 0)),
                    'height': int(video_stream.get('height', 0)),
                    'resolution': f"{video_stream.get('width')}x{video_stream.get('height')}",
                    'aspect_ratio': video_stream.get('display_aspect_ratio'),
                    'fps': eval(video_stream.get('r_frame_rate', '0/1')),  # Convert "30/1" to 30.0
                    'pix_fmt': video_stream.get('pix_fmt'),
                    'color_space': video_stream.get('color_space'),
                })
            
            if audio_streams:
                audio_stream = audio_streams[0]
                metadata.update({
                    'audio_codec': audio_stream.get('codec_name'),
                    'audio_codec_long': audio_stream.get('codec_long_name'),
                    'sample_rate': int(audio_stream.get('sample_rate', 0)),
                    'channels': int(audio_stream.get('channels', 0)),
                    'channel_layout': audio_stream.get('channel_layout'),
                })
            
            # Try to get frame count with OpenCV
            try:
                cap = cv2.VideoCapture(file_path)
                frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                metadata['frame_count'] = frame_count
                cap.release()
            except Exception:
                pass
                
        except Exception as e:
            metadata['error'] = f"Error extracting video metadata: {str(e)}"
        
        return metadata
    
    @staticmethod
    def extract_audio_metadata(file_path: str) -> Dict[str, Any]:
        """
        Extract metadata from audio files
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Dictionary containing audio metadata
        """
        file_ext = os.path.splitext(file_path)[1].lower()
        metadata = {
            'type': 'audio',
            'file_type': 'audio',
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': file_ext,
            'extension': file_ext,
            'file_path': file_path,
            'extracted_at': datetime.utcnow().isoformat()
        }
        
        try:
            # Use ffprobe to get detailed metadata
            probe = ffmpeg.probe(file_path)
            
            # General format info
            format_info = probe.get('format', {})
            metadata.update({
                'format': format_info.get('format_name'),
                'format_long_name': format_info.get('format_long_name'),
                'duration': float(format_info.get('duration', 0)),
                'bit_rate': int(format_info.get('bit_rate', 0)),
                'size': int(format_info.get('size', 0)),
            })
            
            # Extract tags (ID3, etc.)
            tags = format_info.get('tags', {})
            if tags:
                metadata['tags'] = {
                    'title': tags.get('title'),
                    'artist': tags.get('artist'),
                    'album': tags.get('album'),
                    'date': tags.get('date'),
                    'genre': tags.get('genre'),
                    'track': tags.get('track'),
                }
            
            # Stream information
            audio_streams = [s for s in probe.get('streams', []) if s.get('codec_type') == 'audio']
            
            if audio_streams:
                audio_stream = audio_streams[0]
                metadata.update({
                    'codec': audio_stream.get('codec_name'),
                    'codec_long': audio_stream.get('codec_long_name'),
                    'sample_rate': int(audio_stream.get('sample_rate', 0)),
                    'channels': int(audio_stream.get('channels', 0)),
                    'channel_layout': audio_stream.get('channel_layout'),
                    'bit_rate': int(audio_stream.get('bit_rate', 0)) if audio_stream.get('bit_rate') else None,
                })
                
        except Exception as e:
            metadata['error'] = f"Error extracting audio metadata: {str(e)}"
        
        return metadata
    
    @classmethod
    def extract_metadata(cls, file_path: str, media_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Extract metadata based on file type
        
        Args:
            file_path: Path to media file
            media_type: Type of media (image, video, audio). Auto-detected if None.
            
        Returns:
            Dictionary containing extracted metadata
        """
        file_ext = Path(file_path).suffix.lower()
        
        # Auto-detect media type if not provided
        if not media_type:
            if file_ext in Config.SUPPORTED_IMAGE_FORMATS:
                media_type = 'image'
            elif file_ext in Config.SUPPORTED_VIDEO_FORMATS:
                media_type = 'video'
            elif file_ext in Config.SUPPORTED_AUDIO_FORMATS:
                media_type = 'audio'
            else:
                return {
                    'error': f'Unsupported file type: {file_ext}',
                    'file_path': file_path
                }
        
        # Extract metadata based on type
        if media_type == 'image':
            return cls.extract_image_metadata(file_path)
        elif media_type == 'video':
            return cls.extract_video_metadata(file_path)
        elif media_type == 'audio':
            return cls.extract_audio_metadata(file_path)
        else:
            return {
                'error': f'Unknown media type: {media_type}',
                'file_path': file_path
            }


# ============================================================================
# MEDIA COMPRESSOR
# ============================================================================

class MediaCompressor:
    """Compress various media types with optimal codecs"""
    
    @staticmethod
    def compress_image(input_path: str, output_path: Optional[str] = None, 
                      quality: int = None, target_format: str = 'webp') -> Tuple[str, Dict[str, Any]]:
        """
        Compress image to WebP or other formats
        
        Args:
            input_path: Path to input image
            output_path: Path for output (optional)
            quality: Compression quality (1-100)
            target_format: Target format (webp, jpg, png)
            
        Returns:
            Tuple of (output_path, compression_stats)
        """
        if quality is None:
            quality = Config.IMAGE_QUALITY
        
        input_size = os.path.getsize(input_path)
        input_path_obj = Path(input_path)
        
        # Generate output path if not provided
        if not output_path:
            output_path = str(Config.COMPRESSED_DIR / f"{input_path_obj.stem}_compressed.{target_format}")
        
        try:
            with Image.open(input_path) as img:
                # Convert RGBA to RGB if saving as JPEG
                if target_format.lower() in ['jpg', 'jpeg'] and img.mode == 'RGBA':
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[3] if len(img.split()) == 4 else None)
                    img = rgb_img
                
                # Save with compression
                save_kwargs = {'quality': quality, 'optimize': True}
                
                if target_format.lower() == 'webp':
                    save_kwargs['method'] = 6  # Better compression
                elif target_format.lower() == 'png':
                    save_kwargs.pop('quality')  # PNG doesn't use quality param
                    save_kwargs['compress_level'] = 9
                
                img.save(output_path, format=target_format.upper(), **save_kwargs)
            
            output_size = os.path.getsize(output_path)
            compression_ratio = (1 - output_size / input_size) * 100
            
            stats = {
                'original_size': input_size,
                'compressed_size': output_size,
                'compression_ratio': f"{compression_ratio:.2f}%",
                'original_format': input_path_obj.suffix,
                'output_format': f".{target_format}",
                'quality': quality,
            }
            
            return output_path, stats
            
        except Exception as e:
            raise Exception(f"Error compressing image: {str(e)}")
    
    @staticmethod
    def compress_video(input_path: str, output_path: Optional[str] = None,
                      codec: str = 'libx265', crf: int = None,
                      preset: str = 'medium', audio_codec: str = 'aac') -> Tuple[str, Dict[str, Any]]:
        """
        Compress video using H.265 (HEVC) or other codecs
        
        Args:
            input_path: Path to input video
            output_path: Path for output (optional)
            codec: Video codec (libx265, libx264, av1, etc.)
            crf: Constant Rate Factor (0-51, lower is better)
            preset: Encoding preset (ultrafast, fast, medium, slow, veryslow)
            audio_codec: Audio codec (aac, opus, etc.)
            
        Returns:
            Tuple of (output_path, compression_stats)
        """
        if crf is None:
            crf = Config.VIDEO_CRF
        
        input_size = os.path.getsize(input_path)
        input_path_obj = Path(input_path)
        
        # Generate output path if not provided
        if not output_path:
            codec_ext_map = {
                'libx265': 'mp4',
                'libx264': 'mp4',
                'libvpx-vp9': 'webm',
                'libaom-av1': 'mp4',
            }
            ext = codec_ext_map.get(codec, 'mp4')
            output_path = str(Config.COMPRESSED_DIR / f"{input_path_obj.stem}_compressed.{ext}")
        
        try:
            # Build ffmpeg command
            input_stream = ffmpeg.input(input_path)
            
            # Video encoding parameters
            video_params = {
                'vcodec': codec,
                'crf': crf,
                'preset': preset,
            }
            
            # Add codec-specific parameters
            if codec == 'libx265':
                video_params['x265-params'] = 'log-level=error'
            elif codec == 'libvpx-vp9':
                video_params['b:v'] = '0'  # Use CRF mode
            
            # Audio encoding parameters
            audio_params = {
                'acodec': audio_codec,
                'audio_bitrate': '128k'
            }
            
            # Execute ffmpeg
            output_stream = ffmpeg.output(
                input_stream,
                output_path,
                **video_params,
                **audio_params
            )
            
            # Run with overwrite
            ffmpeg.run(output_stream, overwrite_output=True, quiet=True)
            
            output_size = os.path.getsize(output_path)
            compression_ratio = (1 - output_size / input_size) * 100
            
            stats = {
                'original_size': input_size,
                'compressed_size': output_size,
                'compression_ratio': f"{compression_ratio:.2f}%",
                'codec': codec,
                'crf': crf,
                'preset': preset,
                'audio_codec': audio_codec,
            }
            
            return output_path, stats
            
        except ffmpeg.Error as e:
            error_message = e.stderr.decode() if e.stderr else str(e)
            raise Exception(f"Error compressing video: {error_message}")
        except Exception as e:
            raise Exception(f"Error compressing video: {str(e)}")
    
    @staticmethod
    def compress_audio(input_path: str, output_path: Optional[str] = None,
                      codec: str = 'aac', bitrate: str = '128k',
                      sample_rate: int = 44100) -> Tuple[str, Dict[str, Any]]:
        """
        Compress audio file
        
        Args:
            input_path: Path to input audio
            output_path: Path for output (optional)
            codec: Audio codec (aac, opus, mp3, etc.)
            bitrate: Target bitrate (e.g., '128k', '192k')
            sample_rate: Sample rate in Hz
            
        Returns:
            Tuple of (output_path, compression_stats)
        """
        input_size = os.path.getsize(input_path)
        input_path_obj = Path(input_path)
        
        # Generate output path if not provided
        if not output_path:
            codec_ext_map = {
                'aac': 'm4a',
                'libopus': 'opus',
                'libmp3lame': 'mp3',
                'libvorbis': 'ogg',
            }
            ext = codec_ext_map.get(codec, 'm4a')
            output_path = str(Config.COMPRESSED_DIR / f"{input_path_obj.stem}_compressed.{ext}")
        
        try:
            # Build ffmpeg command
            input_stream = ffmpeg.input(input_path)
            
            # Audio encoding parameters
            audio_params = {
                'acodec': codec,
                'audio_bitrate': bitrate,
                'ar': sample_rate,
            }
            
            # Execute ffmpeg
            output_stream = ffmpeg.output(
                input_stream,
                output_path,
                **audio_params
            )
            
            # Run with overwrite
            ffmpeg.run(output_stream, overwrite_output=True, quiet=True)
            
            output_size = os.path.getsize(output_path)
            compression_ratio = (1 - output_size / input_size) * 100
            
            stats = {
                'original_size': input_size,
                'compressed_size': output_size,
                'compression_ratio': f"{compression_ratio:.2f}%",
                'codec': codec,
                'bitrate': bitrate,
                'sample_rate': sample_rate,
            }
            
            return output_path, stats
            
        except ffmpeg.Error as e:
            error_message = e.stderr.decode() if e.stderr else str(e)
            raise Exception(f"Error compressing audio: {error_message}")
        except Exception as e:
            raise Exception(f"Error compressing audio: {str(e)}")
    
    @classmethod
    def compress_media(cls, input_path: str, media_type: Optional[str] = None,
                      output_path: Optional[str] = None, **kwargs) -> Tuple[str, Dict[str, Any]]:
        """
        Compress media based on type
        
        Args:
            input_path: Path to input media file
            media_type: Type of media (image, video, audio). Auto-detected if None.
            output_path: Path for output (optional)
            **kwargs: Additional compression parameters
            
        Returns:
            Tuple of (output_path, compression_stats)
        """
        file_ext = Path(input_path).suffix.lower()
        
        # Auto-detect media type if not provided
        if not media_type:
            if file_ext in Config.SUPPORTED_IMAGE_FORMATS:
                media_type = 'image'
            elif file_ext in Config.SUPPORTED_VIDEO_FORMATS:
                media_type = 'video'
            elif file_ext in Config.SUPPORTED_AUDIO_FORMATS:
                media_type = 'audio'
            else:
                raise ValueError(f'Unsupported file type: {file_ext}')
        
        # Compress based on type
        if media_type == 'image':
            return cls.compress_image(input_path, output_path, **kwargs)
        elif media_type == 'video':
            return cls.compress_video(input_path, output_path, **kwargs)
        elif media_type == 'audio':
            return cls.compress_audio(input_path, output_path, **kwargs)
        else:
            raise ValueError(f'Unknown media type: {media_type}')


# ============================================================================
# EMBEDDINGS GENERATOR
# ============================================================================

class EmbeddingsGenerator:
    """Generate CLIP embeddings for media files"""
    
    def __init__(self, model_name: str = None, device: str = None):
        """
        Initialize CLIP model
        
        Args:
            model_name: CLIP model name (ViT-B/32, ViT-B/16, ViT-L/14)
            device: Device to run on (cuda, cpu, mps). Auto-detected if None.
        """
        self.model_name = model_name or Config.CLIP_MODEL
        
        # Auto-detect device
        if device is None:
            if torch.cuda.is_available():
                self.device = "cuda"
            elif torch.backends.mps.is_available():
                self.device = "mps"
            else:
                self.device = "cpu"
        else:
            self.device = device
        
        print(f"Loading CLIP model '{self.model_name}' on device '{self.device}'...")
        self.model, self.preprocess = clip.load(self.model_name, device=self.device)
        self.model.eval()
        print("CLIP model loaded successfully!")
    
    def generate_image_embedding(self, image_path: str) -> np.ndarray:
        """
        Generate embedding for a single image
        
        Args:
            image_path: Path to image file
            
        Returns:
            Numpy array of embeddings (normalized)
        """
        try:
            image = Image.open(image_path).convert('RGB')
            image_input = self.preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                image_features = self.model.encode_image(image_input)
                # Normalize embeddings
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            return image_features.cpu().numpy().flatten()
            
        except Exception as e:
            raise Exception(f"Error generating image embedding: {str(e)}")
    
    def generate_video_embedding(self, video_path: str, num_frames: int = 10,
                                 method: str = 'average') -> np.ndarray:
        """
        Generate embedding for a video by sampling frames
        
        Args:
            video_path: Path to video file
            num_frames: Number of frames to sample
            method: Aggregation method ('average', 'max', 'first', 'last')
            
        Returns:
            Numpy array of embeddings (normalized)
        """
        try:
            # Open video
            cap = cv2.VideoCapture(video_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            if total_frames == 0:
                raise ValueError("Video has no frames")
            
            # Sample frame indices
            if method == 'first':
                frame_indices = [0]
            elif method == 'last':
                frame_indices = [total_frames - 1]
            else:
                # Sample evenly across video
                frame_indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)
            
            embeddings = []
            
            for frame_idx in frame_indices:
                # Seek to frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                
                if not ret:
                    continue
                
                # Convert BGR to RGB
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                image = Image.fromarray(frame_rgb)
                
                # Preprocess and get embedding
                image_input = self.preprocess(image).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    features = self.model.encode_image(image_input)
                    features = features / features.norm(dim=-1, keepdim=True)
                    embeddings.append(features.cpu().numpy().flatten())
            
            cap.release()
            
            if not embeddings:
                raise ValueError("No frames could be extracted from video")
            
            # Aggregate embeddings
            embeddings_array = np.array(embeddings)
            
            if method == 'average' or method == 'first' or method == 'last':
                final_embedding = np.mean(embeddings_array, axis=0)
            elif method == 'max':
                final_embedding = np.max(embeddings_array, axis=0)
            else:
                final_embedding = np.mean(embeddings_array, axis=0)
            
            # Normalize
            final_embedding = final_embedding / np.linalg.norm(final_embedding)
            
            return final_embedding
            
        except Exception as e:
            raise Exception(f"Error generating video embedding: {str(e)}")
    
    def generate_text_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for text (useful for semantic search)
        
        Args:
            text: Text to encode
            
        Returns:
            Numpy array of embeddings (normalized)
        """
        try:
            text_input = clip.tokenize([text]).to(self.device)
            
            with torch.no_grad():
                text_features = self.model.encode_text(text_input)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            
            return text_features.cpu().numpy().flatten()
            
        except Exception as e:
            raise Exception(f"Error generating text embedding: {str(e)}")
    
    def generate_embedding(self, file_path: str, media_type: Optional[str] = None,
                          **kwargs) -> np.ndarray:
        """
        Generate embedding based on media type
        
        Args:
            file_path: Path to media file
            media_type: Type of media (image, video). Auto-detected if None.
            **kwargs: Additional parameters for specific methods
            
        Returns:
            Numpy array of embeddings
        """
        file_ext = Path(file_path).suffix.lower()
        
        # Auto-detect media type
        if not media_type:
            if file_ext in Config.SUPPORTED_IMAGE_FORMATS:
                media_type = 'image'
            elif file_ext in Config.SUPPORTED_VIDEO_FORMATS:
                media_type = 'video'
            elif file_ext in Config.SUPPORTED_AUDIO_FORMATS:
                # For audio, we can't generate visual embeddings
                # Return a zero embedding or raise an error
                raise ValueError("CLIP cannot generate embeddings for audio files. Only image and video supported.")
            else:
                raise ValueError(f'Unsupported file type: {file_ext}')
        
        # Generate embedding based on type
        if media_type == 'image':
            return self.generate_image_embedding(file_path)
        elif media_type == 'video':
            return self.generate_video_embedding(file_path, **kwargs)
        else:
            raise ValueError(f'Unknown media type: {media_type}')
    
    def compute_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Compute cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding
            embedding2: Second embedding
            
        Returns:
            Similarity score (0-1)
        """
        # Embeddings should already be normalized
        similarity = np.dot(embedding1, embedding2)
        return float(similarity)
    
    def search_similar(self, query_embedding: np.ndarray, 
                      embeddings_list: List[np.ndarray],
                      top_k: int = 5) -> List[tuple]:
        """
        Find most similar embeddings
        
        Args:
            query_embedding: Query embedding
            embeddings_list: List of embeddings to search
            top_k: Number of top results to return
            
        Returns:
            List of (index, similarity_score) tuples
        """
        similarities = []
        
        for idx, embedding in enumerate(embeddings_list):
            similarity = self.compute_similarity(query_embedding, embedding)
            similarities.append((idx, similarity))
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]


# ============================================================================
# MEDIA PROCESSOR (Main Orchestrator)
# ============================================================================

class MediaProcessor:
    """Main media processing pipeline"""
    
    def __init__(self):
        """Initialize all components"""
        print("Initializing Media Processor...")
        
        # Initialize extractors and compressors
        self.metadata_extractor = MetadataExtractor()
        self.compressor = MediaCompressor()
        
        # Initialize embeddings generator (lazy load to save memory)
        self._embeddings_generator = None
        
        # Initialize storage backends
        self.s3_storage = S3Storage()
        self.db_storage = get_db_storage()
        self.pinecone_storage = PineconeStorage()
        
        print("Media Processor initialized successfully!")
    
    @property
    def embeddings_generator(self) -> EmbeddingsGenerator:
        """Lazy load embeddings generator"""
        if self._embeddings_generator is None:
            print("Loading CLIP model...")
            self._embeddings_generator = EmbeddingsGenerator()
        return self._embeddings_generator
    
    def process_media_file(self, file_path: str, 
                          compress: bool = True,
                          generate_embeddings: bool = True,
                          upload_to_s3: bool = True,
                          custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a media file through the complete pipeline
        
        Args:
            file_path: Path to media file
            compress: Whether to compress the file
            generate_embeddings: Whether to generate CLIP embeddings
            upload_to_s3: Whether to upload to S3
            custom_metadata: Additional custom metadata
            
        Returns:
            Dictionary with processing results
        """
        try:
            file_path = str(Path(file_path).absolute())
            file_id = str(uuid.uuid4())
            
            print(f"\n{'='*60}")
            print(f"Processing file: {os.path.basename(file_path)}")
            print(f"File ID: {file_id}")
            print(f"{'='*60}\n")
            
            result = {
                'file_id': file_id,
                'original_file': file_path,
                'success': True,
            }
            
            # Step 1: Extract metadata
            print("Step 1: Extracting metadata...")
            metadata = self.metadata_extractor.extract_metadata(file_path)
            
            if 'error' in metadata:
                result['success'] = False
                result['error'] = metadata['error']
                return result
            
            # Add custom metadata
            if custom_metadata:
                metadata['custom'] = custom_metadata
            
            result['metadata'] = metadata
            print(f"✓ Metadata extracted: {metadata.get('type')} - {metadata.get('format')}")
            
            # Step 2: Compress media (optional)
            compressed_path = None
            compression_stats = None
            
            if compress:
                print("\nStep 2: Compressing media...")
                try:
                    media_type = metadata.get('type')
                    
                    if media_type == 'image':
                        compressed_path, compression_stats = self.compressor.compress_image(
                            file_path,
                            target_format='webp'
                        )
                    elif media_type == 'video':
                        # Skip video compression (too slow - takes minutes even for small files)
                        # Videos will be uploaded in original format
                        print("⚠ Skipping video compression (too slow - uploading original)")
                        compressed_path = None
                        compression_stats = {'skipped': True, 'reason': 'Video compression disabled for performance'}
                    elif media_type == 'audio':
                        # Skip audio compression - keep original format (MP3, M4A, WAV, AAC, etc.)
                        print("⚠ Skipping audio compression (keeping original format)")
                        compressed_path = None
                        compression_stats = {'skipped': True, 'reason': 'Audio compression disabled to preserve original format'}
                    
                    if compressed_path:
                        result['compressed_file'] = compressed_path
                        result['compression_stats'] = compression_stats
                        print(f"✓ Compressed: {compression_stats.get('compression_ratio')} reduction")
                    
                except Exception as e:
                    print(f"⚠ Compression failed: {e}")
                    result['compression_error'] = str(e)
            else:
                print("\nStep 2: Skipping compression (not requested)")
            
            # Step 3: Upload to S3
            s3_info = None
            
            if upload_to_s3:
                print("\nStep 3: Uploading to S3...")
                
                # Upload compressed version if available, otherwise original
                upload_path = compressed_path if compressed_path else file_path
                
                # Generate S3 key with file_id
                file_ext = Path(upload_path).suffix
                s3_key = f"media/{file_id}{file_ext}"
                
                s3_info = self.s3_storage.upload_file(
                    upload_path,
                    s3_key=s3_key,
                    metadata={
                        'file_id': file_id,
                        'original_name': os.path.basename(file_path),
                        'media_type': metadata.get('type'),
                    }
                )
                
                if s3_info.get('success'):
                    result['s3_info'] = s3_info
                    print(f"✓ Uploaded to S3: {s3_key}")
                else:
                    print(f"⚠ S3 upload failed: {s3_info.get('error')}")
                    result['s3_error'] = s3_info.get('error')
            else:
                print("\nStep 3: Skipping S3 upload (not requested)")
            
            # Step 4: Generate embeddings
            embedding_info = None
            
            if generate_embeddings:
                media_type = metadata.get('type')
                
                # Only generate embeddings for images and videos (CLIP supports visual data)
                if media_type in ['image', 'video']:
                    print("\nStep 4: Generating CLIP embeddings...")
                    
                    try:
                        # Use original file for embedding (better quality)
                        embedding = self.embeddings_generator.generate_embedding(file_path)
                        
                        # Store in Pinecone
                        pinecone_metadata = {
                            'file_id': file_id,
                            'type': media_type,
                            'format': metadata.get('format', ''),
                            'original_name': os.path.basename(file_path),
                        }
                        
                        pinecone_result = self.pinecone_storage.upsert_embedding(
                            file_id=file_id,
                            embedding=embedding,
                            metadata=pinecone_metadata
                        )
                        
                        if pinecone_result.get('success'):
                            embedding_info = {
                                'dimension': len(embedding),
                                'stored_in_pinecone': True,
                            }
                            result['embedding_info'] = embedding_info
                            print(f"✓ Embedding generated and stored ({len(embedding)} dimensions)")
                        else:
                            print(f"⚠ Pinecone storage failed: {pinecone_result.get('error')}")
                            result['embedding_error'] = pinecone_result.get('error')
                    
                    except Exception as e:
                        print(f"⚠ Embedding generation failed: {e}")
                        result['embedding_error'] = str(e)
                else:
                    print(f"\nStep 4: Skipping embeddings (not supported for {media_type})")
            else:
                print("\nStep 4: Skipping embeddings (not requested)")
            
            # Step 5: Store metadata in database
            print("\nStep 5: Storing metadata in database...")
            
            db_result = self.db_storage.insert_media(
                file_id=file_id,
                metadata=metadata,
                s3_info=s3_info or {},
                embedding_info=embedding_info
            )
            
            if db_result.get('success'):
                result['db_info'] = db_result
                print(f"✓ Metadata stored in database")
            else:
                print(f"⚠ Database storage failed: {db_result.get('error')}")
                result['db_error'] = db_result.get('error')
            
            # Clean up temporary compressed file
            if compressed_path and os.path.exists(compressed_path):
                # Keep compressed file if we want to store it locally
                pass
            
            print(f"\n{'='*60}")
            print(f"✓ Processing complete for {file_id}")
            print(f"{'='*60}\n")
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Processing failed: {str(e)}",
                'file_path': file_path,
            }
    
    def search_similar_media(self, query_type: str, query: Any, top_k: int = 10) -> Dict[str, Any]:
        """
        Search for similar media using semantic search
        
        Args:
            query_type: Type of query ('image', 'video', 'text')
            query: Query data (file path for image/video, text string for text)
            top_k: Number of results to return
            
        Returns:
            Search results with metadata
        """
        try:
            print(f"\nSearching for similar media (query_type: {query_type}, top_k: {top_k})")
            
            # Generate query embedding
            if query_type == 'text':
                query_embedding = self.embeddings_generator.generate_text_embedding(query)
            elif query_type in ['image', 'video']:
                query_embedding = self.embeddings_generator.generate_embedding(query)
            else:
                return {
                    'success': False,
                    'error': f"Unsupported query type: {query_type}"
                }
            
            # Search in Pinecone
            similar_items = self.pinecone_storage.search_similar(
                query_embedding=query_embedding,
                top_k=top_k
            )
            
            # Enrich with full metadata from database
            results = []
            for item in similar_items:
                file_id = item['file_id']
                
                # Get full metadata from database
                db_record = self.db_storage.get_media(file_id)
                
                if db_record:
                    results.append({
                        'file_id': file_id,
                        'similarity_score': item['score'],
                        'metadata': db_record.get('metadata', {}),
                        's3_info': db_record.get('s3_info', {}),
                    })
            
            print(f"✓ Found {len(results)} similar items")
            
            return {
                'success': True,
                'query_type': query_type,
                'results': results,
                'count': len(results),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Search failed: {str(e)}"
            }
    
    def get_media_info(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Get complete information about a media file
        
        Args:
            file_id: File identifier
            
        Returns:
            Media information or None
        """
        return self.db_storage.get_media(file_id)
    
    def delete_media(self, file_id: str) -> Dict[str, Any]:
        """
        Delete media file from all storage backends
        
        Args:
            file_id: File identifier
            
        Returns:
            Deletion result
        """
        try:
            print(f"Deleting media: {file_id}")
            
            # Get media info to find S3 key
            media_info = self.db_storage.get_media(file_id)
            
            results = {
                'file_id': file_id,
                'success': True,
            }
            
            # Delete from S3
            if media_info and media_info.get('s3_info', {}).get('s3_key'):
                s3_key = media_info['s3_info']['s3_key']
                s3_result = self.s3_storage.delete_file(s3_key)
                results['s3_deletion'] = s3_result
            
            # Delete from Pinecone
            pinecone_result = self.pinecone_storage.delete_embedding(file_id)
            results['pinecone_deletion'] = pinecone_result
            
            # Delete from database (last)
            db_result = self.db_storage.delete_media(file_id)
            results['db_deletion'] = db_result
            
            print(f"✓ Media deleted: {file_id}")
            
            return results
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

if __name__ == "__main__":
    import sys
    
    # Validate configuration
    missing_config = Config.validate()
    if missing_config:
        print("❌ Missing required configuration:")
        for key in missing_config:
            print(f"  - {key}")
        print("\nPlease set these in your .env file")
        sys.exit(1)
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Initialize processor
        processor = MediaProcessor()
        
        # Process file
        result = processor.process_media_file(file_path)
        
        # Print summary
        print("\n" + "="*60)
        print("PROCESSING SUMMARY")
        print("="*60)
        
        if result.get('success'):
            print(f"✓ Success!")
            print(f"File ID: {result['file_id']}")
            
            if 'compression_stats' in result:
                print(f"Compression: {result['compression_stats']['compression_ratio']}")
            
            if 'embedding_info' in result:
                print(f"Embedding: {result['embedding_info']['dimension']} dimensions")
        else:
            print(f"❌ Failed: {result.get('error')}")
        
        print("="*60)
    else:
        print("Usage: python media_pipeline.py <file_path>")
        print("\nExample: python media_pipeline.py /path/to/image.jpg")

