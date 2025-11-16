"""
Unified Embedding Service for Complete Semantic Search
Handles ALL file types: images, videos, audio, documents, code, structured data
"""
import os
import json
import csv
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional, Dict, Any, List, Union
import numpy as np

# Image/Video embeddings
try:
    import torch
    import clip
    from PIL import Image
    import cv2
    CLIP_AVAILABLE = True
except ImportError:
    CLIP_AVAILABLE = False

# Text embeddings
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

# Code embeddings
try:
    from transformers import AutoTokenizer, AutoModel
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

# Audio transcription
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False

# Audio/video processing
try:
    import ffmpeg
    FFMPEG_AVAILABLE = True
except ImportError:
    FFMPEG_AVAILABLE = False

from config import Config

# Gemini API (text embeddings)
try:
    from google import genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# Vertex AI (multimodal embeddings)
try:
    import vertexai
    from vertexai.vision_models import Image as VertexImage, MultiModalEmbeddingModel
    VERTEX_AI_AVAILABLE = True
except ImportError:
    VERTEX_AI_AVAILABLE = False

# Target dimension for Pinecone (all embeddings will be normalized to this)
# NOTE: If you change this, you MUST recreate the Pinecone index!
TARGET_EMBEDDING_DIM = 512  # Standard CLIP dimension (change to 768 for Gemini, requires index recreation)


def normalize_embedding_dimension(embedding: np.ndarray, target_dim: int = TARGET_EMBEDDING_DIM) -> np.ndarray:
    """
    Normalize embedding to target dimension
    
    - If embedding is smaller: pad with zeros
    - If embedding is larger: use PCA-like truncation or averaging
    
    Args:
        embedding: Input embedding of any dimension
        target_dim: Target dimension (default 512)
        
    Returns:
        Normalized embedding of target_dim
    """
    current_dim = len(embedding)
    
    if current_dim == target_dim:
        return embedding
    
    elif current_dim < target_dim:
        # Pad with zeros
        padding = np.zeros(target_dim - current_dim)
        return np.concatenate([embedding, padding])
    
    else:
        # Truncate to target dimension (simple approach)
        # More sophisticated: use PCA, but requires training
        return embedding[:target_dim]


class UnifiedEmbeddingService:
    """
    Unified service for generating embeddings for ALL file types
    
    Supports:
    - Images: CLIP visual embeddings OR Gemini Vision
    - Videos: CLIP visual + Whisper audio transcription OR Gemini Vision
    - Audio: Whisper transcription + text embeddings
    - Documents: Text extraction + sentence embeddings OR Gemini text
    - Code: CodeBERT embeddings OR Gemini text
    - Structured Data: Text conversion + embeddings OR Gemini text
    """
    
    def __init__(self):
        """Initialize all embedding models (lazy loading)"""
        self._clip_model = None
        self._clip_preprocess = None
        self._text_model = None
        self._code_model = None
        self._code_tokenizer = None
        self._whisper_model = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Initialize Gemini client (for text embeddings)
        self._gemini_client = None
        if GEMINI_AVAILABLE and Config.GEMINI_API_KEY:
            try:
                self._gemini_client = genai.Client(api_key=Config.GEMINI_API_KEY)
            except Exception as e:
                print(f"   ⚠ Gemini client initialization failed: {e}")
        
        # Initialize Vertex AI (for multimodal embeddings)
        self._vertex_ai_model = None
        if VERTEX_AI_AVAILABLE and Config.GCP_PROJECT_ID:
            try:
                vertexai.init(project=Config.GCP_PROJECT_ID, location=Config.GCP_LOCATION)
                self._vertex_ai_model = MultiModalEmbeddingModel.from_pretrained("multimodalembedding@001")
            except Exception as e:
                print(f"   ⚠ Vertex AI initialization failed: {e}")
        
        print("🔧 Unified Embedding Service initialized")
        print(f"   Device: {self.device}")
        print(f"   CLIP: {'✅' if CLIP_AVAILABLE else '❌'}")
        print(f"   SentenceTransformers: {'✅' if SENTENCE_TRANSFORMERS_AVAILABLE else '❌'}")
        print(f"   Whisper: {'✅' if WHISPER_AVAILABLE else '❌'}")
        print(f"   CodeBERT: {'✅' if TRANSFORMERS_AVAILABLE else '❌'}")
        print(f"   Gemini (text): {'✅' if self._gemini_client else '❌'}")
        print(f"   Vertex AI (multimodal): {'✅' if self._vertex_ai_model else '❌'}")
    
    # ========================================================================
    # MODEL LOADERS (Lazy Loading)
    # ========================================================================
    
    @property
    def clip_model(self):
        """Lazy load CLIP model"""
        if self._clip_model is None and CLIP_AVAILABLE:
            print("Loading CLIP model...")
            model_name = Config.CLIP_MODEL or "ViT-B/32"
            self._clip_model, self._clip_preprocess = clip.load(model_name, device=self.device)
            print(f"✓ CLIP model loaded: {model_name}")
        return self._clip_model
    
    @property
    def clip_preprocess(self):
        """Get CLIP preprocessing function"""
        if self._clip_preprocess is None:
            _ = self.clip_model  # Trigger loading
        return self._clip_preprocess
    
    @property
    def text_model(self):
        """Lazy load SentenceTransformer model"""
        if self._text_model is None and SENTENCE_TRANSFORMERS_AVAILABLE:
            print("Loading SentenceTransformer model...")
            self._text_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("✓ SentenceTransformer loaded: all-MiniLM-L6-v2 (384 dim)")
        return self._text_model
    
    @property
    def code_model(self):
        """Lazy load CodeBERT model"""
        if self._code_model is None and TRANSFORMERS_AVAILABLE:
            print("Loading CodeBERT model...")
            try:
                model_name = "microsoft/codebert-base"
                self._code_tokenizer = AutoTokenizer.from_pretrained(model_name)
                self._code_model = AutoModel.from_pretrained(model_name)
                self._code_model.to(self.device)
                print(f"✓ CodeBERT loaded: {model_name} (768 dim)")
            except Exception as e:
                print(f"⚠ Could not load CodeBERT: {e}")
        return self._code_model
    
    @property
    def code_tokenizer(self):
        """Get CodeBERT tokenizer"""
        if self._code_tokenizer is None:
            _ = self.code_model  # Trigger loading
        return self._code_tokenizer
    
    @property
    def whisper_model(self):
        """Lazy load Whisper model"""
        if self._whisper_model is None and WHISPER_AVAILABLE:
            print("Loading Whisper model...")
            model_size = os.getenv("WHISPER_MODEL", "base")  # base, small, medium, large
            self._whisper_model = whisper.load_model(model_size)
            print(f"✓ Whisper loaded: {model_size}")
        return self._whisper_model
    
    # ========================================================================
    # GEMINI EMBEDDINGS
    # ========================================================================
    
    def generate_gemini_text_embedding(self, text: str) -> Optional[np.ndarray]:
        """Generate embedding using Gemini API for text"""
        if not self._gemini_client:
            return None
        
        try:
            result = self._gemini_client.models.embed_content(
                model="models/embedding-001",
                contents={"text": text}
            )
            
            # Result is an EmbedContentResponse object with embeddings list
            if hasattr(result, 'embeddings') and result.embeddings:
                # embeddings[0] is a ContentEmbedding object with .values
                return np.array(result.embeddings[0].values, dtype=np.float32)
            return None
            
        except Exception as e:
            print(f"   ⚠ Gemini text embedding failed: {e}")
            return None
    
    def generate_gemini_image_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """
        DEPRECATED: Gemini embedding-001 only supports text, not images.
        Use Vertex AI multimodalembedding@001 instead.
        """
        print("   ⚠ Gemini embedding-001 doesn't support images. Use Vertex AI instead.")
        return None
    
    def _generate_vertex_image_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """Generate embedding using Vertex AI multimodal model for images"""
        if not self._vertex_ai_model:
            return None
        
        try:
            # Load image using Vertex AI Image class
            image = VertexImage.load_from_file(image_path)
            
            # Generate embedding
            embeddings = self._vertex_ai_model.get_embeddings(image=image)
            
            # Extract the image embedding vector
            if hasattr(embeddings, 'image_embedding') and embeddings.image_embedding:
                return np.array(embeddings.image_embedding, dtype=np.float32)
            return None
            
        except Exception as e:
            print(f"   ⚠ Vertex AI image embedding failed: {e}")
            return None
    
    # ========================================================================
    # AUDIO TRANSCRIPTION
    # ========================================================================
    
    def transcribe_audio(self, audio_path: str) -> str:
        """
        Transcribe audio file to text using Whisper
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Transcribed text
        """
        if not WHISPER_AVAILABLE:
            return ""
        
        try:
            print(f"   Transcribing audio: {Path(audio_path).name}...")
            result = self.whisper_model.transcribe(audio_path)
            text = result["text"].strip()
            print(f"   ✓ Transcribed: {len(text)} characters")
            return text
        except Exception as e:
            print(f"   ⚠ Transcription failed: {e}")
            return ""
    
    def extract_audio_from_video(self, video_path: str, output_path: Optional[str] = None) -> Optional[str]:
        """
        Extract audio track from video file
        
        Args:
            video_path: Path to video file
            output_path: Where to save audio (temp file if None)
            
        Returns:
            Path to extracted audio file
        """
        if not FFMPEG_AVAILABLE:
            return None
        
        try:
            if output_path is None:
                output_path = str(Path(video_path).with_suffix('.wav'))
            
            # Extract audio using ffmpeg
            ffmpeg.input(video_path).output(
                output_path,
                acodec='pcm_s16le',
                ac=1,  # mono
                ar='16000'  # 16kHz (Whisper expects this)
            ).overwrite_output().run(quiet=True)
            
            return output_path
        except Exception as e:
            print(f"   ⚠ Audio extraction failed: {e}")
            return None
    
    # ========================================================================
    # STRUCTURED DATA CONVERSION
    # ========================================================================
    
    def convert_json_to_text(self, data: Union[Dict, List]) -> str:
        """Convert JSON to human-readable text"""
        if isinstance(data, list):
            # Array of objects
            texts = []
            for item in data[:10]:  # First 10 items
                if isinstance(item, dict):
                    texts.append(self._dict_to_text(item))
                else:
                    texts.append(str(item))
            return " | ".join(texts)
        elif isinstance(data, dict):
            return self._dict_to_text(data)
        else:
            return str(data)
    
    def _dict_to_text(self, d: Dict) -> str:
        """Convert dictionary to readable text"""
        parts = []
        for key, value in d.items():
            if isinstance(value, (dict, list)):
                continue  # Skip nested structures
            parts.append(f"{key}: {value}")
        return ", ".join(parts)
    
    def convert_csv_to_text(self, csv_path: str) -> str:
        """Convert CSV to text (column names + sample rows)"""
        try:
            with open(csv_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                rows = list(reader)[:5]  # First 5 rows
                
                if not rows:
                    return ""
                
                # Column names
                columns = list(rows[0].keys())
                text = f"Columns: {', '.join(columns)}. "
                
                # Sample values
                for row in rows:
                    row_text = self._dict_to_text(row)
                    text += row_text + ". "
                
                return text
        except Exception as e:
            print(f"   ⚠ CSV conversion failed: {e}")
            return ""
    
    def convert_xml_to_text(self, xml_path: str) -> str:
        """Convert XML to text"""
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            
            def extract_text(element, depth=0):
                if depth > 3:  # Limit depth
                    return ""
                text = element.text or ""
                for child in element:
                    text += " " + extract_text(child, depth + 1)
                return text.strip()
            
            return extract_text(root)
        except Exception as e:
            print(f"   ⚠ XML conversion failed: {e}")
            return ""
    
    # ========================================================================
    # EMBEDDING GENERATION (Main Methods)
    # ========================================================================
    
    def generate_image_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """Generate embedding for image"""
        
        # 🔄 TOGGLE: Priority order for image embeddings
        # 1. Try Vertex AI (Google Cloud multimodal model) - Best quality
        # 2. Fallback to local CLIP - Fast, no API needed
        
        # Try Vertex AI first if available
        if self._vertex_ai_model:
            try:
                result = self._generate_vertex_image_embedding(image_path)
                if result is not None:
                    return result
                # If Vertex AI returns None, fall through to CLIP
                print(f"   ⚠ Vertex AI returned None, falling back to CLIP")
            except Exception as e:
                error_msg = str(e)
                # Check if it's a quota error
                if "429" in error_msg or "Quota exceeded" in error_msg:
                    print(f"   ⚠ Vertex AI quota exceeded, falling back to CLIP")
                else:
                    print(f"   ⚠ Vertex AI failed, falling back to CLIP: {e}")
        
        # Fallback to CLIP (local, fast, unlimited)
        return self._generate_clip_image_embedding(image_path)
    
    def _generate_clip_image_embedding(self, image_path: str) -> Optional[np.ndarray]:
        """Generate CLIP embedding for image (local)"""
        if not CLIP_AVAILABLE:
            return None
        
        try:
            image = Image.open(image_path).convert('RGB')
            image_tensor = self.clip_preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                embedding = self.clip_model.encode_image(image_tensor)
                embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            
            return embedding.cpu().numpy().flatten()
        except Exception as e:
            print(f"   ⚠ Image embedding failed: {e}")
            return None
    
    def generate_video_embedding(self, video_path: str, include_audio: bool = True) -> Optional[np.ndarray]:
        """
        Generate combined embedding for video (visual + audio)
        
        Args:
            video_path: Path to video file
            include_audio: Whether to include audio transcription
            
        Returns:
            Combined embedding (visual + text from audio)
        """
        if not CLIP_AVAILABLE:
            return None
        
        try:
            # 1. Visual embedding (sample middle frame)
            cap = cv2.VideoCapture(video_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            middle_frame = total_frames // 2
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, middle_frame)
            ret, frame = cap.read()
            cap.release()
            
            if not ret:
                return None
            
            # Convert BGR to RGB and create PIL Image
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(frame_rgb)
            image_tensor = self.clip_preprocess(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                visual_embedding = self.clip_model.encode_image(image_tensor)
                visual_embedding = visual_embedding / visual_embedding.norm(dim=-1, keepdim=True)
            
            visual_emb = visual_embedding.cpu().numpy().flatten()
            
            # 2. Audio embedding (if requested)
            if include_audio and WHISPER_AVAILABLE:
                audio_path = self.extract_audio_from_video(video_path)
                if audio_path:
                    transcript = self.transcribe_audio(audio_path)
                    if transcript:
                        text_emb = self.generate_text_embedding(transcript, use_clip=False)
                        if text_emb is not None:
                            # Combine embeddings (weighted average)
                            # Visual: 70%, Audio text: 30%
                            combined = np.concatenate([visual_emb * 0.7, text_emb * 0.3])
                            return combined
                    
                    # Clean up temp audio file
                    if os.path.exists(audio_path):
                        os.remove(audio_path)
            
            return visual_emb
            
        except Exception as e:
            print(f"   ⚠ Video embedding failed: {e}")
            return None
    
    def generate_audio_embedding(self, audio_path: str) -> Optional[np.ndarray]:
        """
        Generate embedding for audio file (transcribe → text embedding)
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Text embedding of transcribed audio
        """
        if not WHISPER_AVAILABLE or not SENTENCE_TRANSFORMERS_AVAILABLE:
            return None
        
        try:
            # Transcribe audio
            transcript = self.transcribe_audio(audio_path)
            if not transcript:
                return None
            
            # Generate text embedding (use SentenceTransformer for transcripts)
            return self.generate_text_embedding(transcript, use_clip=False)
        except Exception as e:
            print(f"   ⚠ Audio embedding failed: {e}")
            return None
    
    def generate_text_embedding(self, text: str, use_clip: bool = True) -> Optional[np.ndarray]:
        """
        Generate text embedding
        
        Args:
            text: Text to encode
            use_clip: If True, use CLIP/Gemini (for multimodal search). If False, use SentenceTransformer.
        
        Returns:
            Text embedding as numpy array
        """
        if not text or len(text.strip()) == 0:
            return None
        
        try:
            if use_clip:
                # 🔄 TOGGLE: Comment/uncomment one of these two lines to switch
                # NOTE: If using Gemini, must set TARGET_EMBEDDING_DIM to 768 and recreate Pinecone index
                # return self.generate_gemini_text_embedding(text)  # 🌟 Gemini (768 dim, multimodal)
                return self._generate_clip_text_embedding(text)  # 🏠 Local CLIP (512 dim, works with current index)
            
            elif SENTENCE_TRANSFORMERS_AVAILABLE:
                # Fallback to SentenceTransformer (for documents/code)
                embedding = self.text_model.encode(text, convert_to_numpy=True)
                return embedding
            
            else:
                return None
                
        except Exception as e:
            print(f"   ⚠ Text embedding failed: {e}")
            return None
    
    def _generate_clip_text_embedding(self, text: str) -> Optional[np.ndarray]:
        """Generate CLIP text embedding (local)"""
        if not CLIP_AVAILABLE:
            return None
        
        try:
            text_tokens = clip.tokenize([text]).to(self.device)
            with torch.no_grad():
                text_features = self.clip_model.encode_text(text_tokens)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
                embedding = text_features.cpu().numpy().flatten()
            return embedding
        except Exception as e:
            print(f"   ⚠ CLIP text embedding failed: {e}")
            return None
    
    def generate_code_embedding(self, code: str) -> Optional[np.ndarray]:
        """Generate CodeBERT embedding for code"""
        if not TRANSFORMERS_AVAILABLE or self.code_model is None:
            return None
        
        try:
            # Tokenize code
            inputs = self.code_tokenizer(
                code,
                return_tensors="pt",
                max_length=512,
                truncation=True,
                padding=True
            ).to(self.device)
            
            # Generate embedding
            with torch.no_grad():
                outputs = self.code_model(**inputs)
                # Use [CLS] token embedding
                embedding = outputs.last_hidden_state[:, 0, :].squeeze().cpu().numpy()
            
            return embedding
        except Exception as e:
            print(f"   ⚠ Code embedding failed: {e}")
            return None
    
    def generate_structured_data_embedding(self, file_path: str, file_type: str) -> Optional[np.ndarray]:
        """
        Generate embedding for structured data (JSON, CSV, XML)
        
        Args:
            file_path: Path to structured data file
            file_type: Type of file ('json', 'csv', 'xml')
            
        Returns:
            Text embedding of converted data
        """
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            return None
        
        try:
            # Convert to text
            if file_type == 'json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                text = self.convert_json_to_text(data)
            elif file_type == 'csv':
                text = self.convert_csv_to_text(file_path)
            elif file_type == 'xml':
                text = self.convert_xml_to_text(file_path)
            else:
                return None
            
            if not text:
                return None
            
            # Generate embedding (use Gemini for better quality)
            if self._gemini_client:
                return self.generate_gemini_text_embedding(text)
            else:
                # Fallback to SentenceTransformer
                return self.generate_text_embedding(text, use_clip=False)
        except Exception as e:
            print(f"   ⚠ Structured data embedding failed: {e}")
            return None
    
    # ========================================================================
    # UNIFIED INTERFACE
    # ========================================================================
    
    def generate_embedding(self, file_path: str, file_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Generate embedding for ANY file type
        
        Args:
            file_path: Path to file
            file_type: Optional file type hint
            
        Returns:
            Dictionary with embedding and metadata:
            {
                'embedding': np.ndarray,
                'dimension': int,
                'model': str,
                'metadata': dict
            }
        """
        file_ext = Path(file_path).suffix.lower()
        
        # Auto-detect file type if not provided
        if not file_type:
            if file_ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']:
                file_type = 'image'
            elif file_ext in ['.mp4', '.mov', '.avi', '.mkv', '.webm']:
                file_type = 'video'
            elif file_ext in ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac']:
                file_type = 'audio'
            elif file_ext in ['.pdf', '.txt', '.docx', '.doc']:
                file_type = 'document'
            elif file_ext in ['.py', '.java', '.js', '.ts', '.cpp', '.c', '.go', '.rs']:
                file_type = 'code'
            elif file_ext in ['.json', '.csv', '.xml']:
                file_type = 'structured'
            else:
                file_type = 'unknown'
        
        print(f"🔍 Generating {file_type} embedding for: {Path(file_path).name}")
        
        # Generate embedding based on type
        embedding = None
        model_name = None
        metadata = {'file_type': file_type}
        
        if file_type == 'image':
            embedding = self.generate_image_embedding(file_path)
            # Detect which model was used
            if self._vertex_ai_model:
                model_name = 'Vertex AI Multimodal'
            else:
                model_name = 'CLIP'
        
        elif file_type == 'video':
            embedding = self.generate_video_embedding(file_path, include_audio=True)
            model_name = 'CLIP + Whisper'
            metadata['multimodal'] = True
        
        elif file_type == 'audio':
            embedding = self.generate_audio_embedding(file_path)
            model_name = 'Whisper + SentenceTransformer'
        
        elif file_type == 'document':
            # For documents, use Gemini for better quality
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()[:5000]  # First 5000 chars
                
                # Try Gemini first, fallback to SentenceTransformer
                if self._gemini_client:
                    embedding = self.generate_gemini_text_embedding(text)
                    model_name = 'Gemini Text'
                else:
                    embedding = self.generate_text_embedding(text, use_clip=False)
                    model_name = 'SentenceTransformer'
            except:
                pass
        
        elif file_type == 'code':
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    code = f.read()
                embedding = self.generate_code_embedding(code)
                model_name = 'CodeBERT'
            except:
                pass
        
        elif file_type == 'structured':
            struct_type = 'json' if file_ext == '.json' else 'csv' if file_ext == '.csv' else 'xml'
            embedding = self.generate_structured_data_embedding(file_path, struct_type)
            # Model name depends on what's available
            model_name = 'Gemini Text' if self._gemini_client else 'SentenceTransformer'
        
        if embedding is None:
            print(f"   ⚠ Could not generate embedding")
            return None
        
        # Normalize to target dimension for Pinecone compatibility
        original_dim = len(embedding)
        embedding = normalize_embedding_dimension(embedding, TARGET_EMBEDDING_DIM)
        
        if original_dim != TARGET_EMBEDDING_DIM:
            print(f"   ✓ Generated: {original_dim} dimensions → normalized to {TARGET_EMBEDDING_DIM} ({model_name})")
        else:
            print(f"   ✓ Generated: {len(embedding)} dimensions ({model_name})")
        
        return {
            'embedding': embedding,
            'dimension': len(embedding),
            'original_dimension': original_dim,
            'model': model_name,
            'metadata': metadata
        }


# Global instance (singleton pattern)
_embedding_service = None

def get_embedding_service() -> UnifiedEmbeddingService:
    """Get global embedding service instance"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = UnifiedEmbeddingService()
    return _embedding_service


if __name__ == "__main__":
    # Test the service
    service = UnifiedEmbeddingService()
    print("\n✅ Embedding service ready!")
    print(f"   Available models: CLIP={CLIP_AVAILABLE}, Whisper={WHISPER_AVAILABLE}, Text={SENTENCE_TRANSFORMERS_AVAILABLE}, Code={TRANSFORMERS_AVAILABLE}")

