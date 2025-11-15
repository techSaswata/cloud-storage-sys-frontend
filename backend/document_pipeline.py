"""
Document Pipeline for PDF/TXT/DOCX files
Handles text extraction, chunking, embeddings, and storage
"""
import os
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
import hashlib
import gzip

# Text extraction
try:
    import PyPDF2
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import docx
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

# NLP and embeddings
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

from config import Config
from storage_s3 import S3Storage
from storage_db import get_db_storage
from storage_pinecone import PineconeStorage


class DocumentProcessor:
    """Process documents (PDF, TXT, DOCX)"""
    
    def __init__(self):
        """Initialize document processor"""
        print("Initializing Document Processor...")
        
        # Initialize storage backends
        self.s3_storage = S3Storage()
        self.db_storage = get_db_storage()
        self.pinecone_storage = PineconeStorage()
        
        # Lazy load embedding model
        self._embedding_model = None
        
        print("Document Processor initialized!")
    
    @property
    def embedding_model(self):
        """Lazy load sentence transformer model"""
        if self._embedding_model is None:
            if not SENTENCE_TRANSFORMERS_AVAILABLE:
                raise ImportError("sentence-transformers not installed. Install with: pip install sentence-transformers")
            print("Loading SentenceTransformer model...")
            self._embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("SentenceTransformer model loaded!")
        return self._embedding_model
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        if not PDF_AVAILABLE:
            raise ImportError("PyPDF2 not installed. Install with: pip install PyPDF2")
        
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"
        except Exception as e:
            raise Exception(f"Error extracting PDF text: {str(e)}")
        
        return text.strip()
    
    def extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from TXT file"""
        try:
            # Try different encodings
            encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as file:
                        return file.read()
                except UnicodeDecodeError:
                    continue
            
            # If all encodings fail, read as binary and decode with errors='ignore'
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as file:
                return file.read()
                
        except Exception as e:
            raise Exception(f"Error reading text file: {str(e)}")
    
    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        if not DOCX_AVAILABLE:
            raise ImportError("python-docx not installed. Install with: pip install python-docx")
        
        try:
            doc = docx.Document(file_path)
            text = []
            
            for paragraph in doc.paragraphs:
                text.append(paragraph.text)
            
            return '\n'.join(text)
            
        except Exception as e:
            raise Exception(f"Error extracting DOCX text: {str(e)}")
    
    def extract_text(self, file_path: str) -> str:
        """Extract text based on file type"""
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_ext == '.txt':
            return self.extract_text_from_txt(file_path)
        elif file_ext == '.docx':
            return self.extract_text_from_docx(file_path)
        else:
            raise ValueError(f"Unsupported document type: {file_ext}")
    
    def chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            chunk_size: Maximum characters per chunk
            overlap: Number of characters to overlap
            
        Returns:
            List of text chunks
        """
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            # Try to break at sentence or word boundary
            if end < len(text):
                # Look for sentence ending
                last_period = chunk.rfind('.')
                last_newline = chunk.rfind('\n')
                last_boundary = max(last_period, last_newline)
                
                if last_boundary > chunk_size * 0.5:  # At least 50% of chunk
                    chunk = chunk[:last_boundary + 1]
                    end = start + last_boundary + 1
            
            chunks.append(chunk.strip())
            start = end - overlap
        
        return chunks
    
    def compress_file(self, file_path: str, output_path: Optional[str] = None) -> tuple:
        """
        Compress document file using gzip
        
        Args:
            file_path: Path to input file
            output_path: Path for output (optional)
            
        Returns:
            Tuple of (compressed_path, stats)
        """
        input_size = os.path.getsize(file_path)
        
        if not output_path:
            output_path = str(Config.COMPRESSED_DIR / f"{Path(file_path).stem}_compressed.gz")
        
        try:
            with open(file_path, 'rb') as f_in:
                with gzip.open(output_path, 'wb', compresslevel=9) as f_out:
                    f_out.writelines(f_in)
            
            output_size = os.path.getsize(output_path)
            compression_ratio = (1 - output_size / input_size) * 100
            
            stats = {
                'original_size': input_size,
                'compressed_size': output_size,
                'compression_ratio': f"{compression_ratio:.2f}%",
                'method': 'gzip',
            }
            
            return output_path, stats
            
        except Exception as e:
            raise Exception(f"Error compressing file: {str(e)}")
    
    def extract_metadata(self, file_path: str, text_content: str) -> Dict[str, Any]:
        """Extract metadata from document"""
        from datetime import datetime
        
        file_ext = Path(file_path).suffix.lower()
        
        metadata = {
            'type': 'document',
            'file_type': 'document',
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': file_ext,
            'extension': file_ext,
            'extracted_at': datetime.utcnow().isoformat(),
            'character_count': len(text_content),
            'word_count': len(text_content.split()),
            'line_count': len(text_content.split('\n')),
        }
        
        # Add document-specific metadata
        if file_ext == '.pdf':
            try:
                if PDF_AVAILABLE:
                    with open(file_path, 'rb') as file:
                        pdf_reader = PyPDF2.PdfReader(file)
                        metadata['page_count'] = len(pdf_reader.pages)
                        
                        # Extract PDF metadata
                        if pdf_reader.metadata:
                            pdf_meta = pdf_reader.metadata
                            metadata['pdf_metadata'] = {
                                'title': pdf_meta.get('/Title', ''),
                                'author': pdf_meta.get('/Author', ''),
                                'subject': pdf_meta.get('/Subject', ''),
                                'creator': pdf_meta.get('/Creator', ''),
                                'producer': pdf_meta.get('/Producer', ''),
                                'creation_date': pdf_meta.get('/CreationDate', ''),
                            }
            except Exception as e:
                metadata['extraction_warning'] = str(e)
        
        # Compute SHA-256 hash for deduplication
        with open(file_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        metadata['sha256_hash'] = file_hash
        
        return metadata
    
    def process_document(self, file_path: str, 
                        compress: bool = True,
                        generate_embeddings: bool = True,
                        custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process document through complete pipeline
        
        Args:
            file_path: Path to document file
            compress: Whether to compress the file
            generate_embeddings: Whether to generate embeddings
            custom_metadata: Additional metadata
            
        Returns:
            Processing result dictionary
        """
        try:
            file_path = str(Path(file_path).absolute())
            file_id = str(uuid.uuid4())
            
            print(f"\n{'='*60}")
            print(f"Processing document: {os.path.basename(file_path)}")
            print(f"File ID: {file_id}")
            print(f"{'='*60}\n")
            
            result = {
                'file_id': file_id,
                'original_file': file_path,
                'success': True,
            }
            
            # Step 1: Extract text
            print("Step 1: Extracting text content...")
            text_content = self.extract_text(file_path)
            print(f"✓ Extracted {len(text_content)} characters")
            
            # Step 2: Extract metadata
            print("\nStep 2: Extracting metadata...")
            metadata = self.extract_metadata(file_path, text_content)
            
            if custom_metadata:
                metadata['custom'] = custom_metadata
            
            result['metadata'] = metadata
            print(f"✓ Metadata extracted: {metadata.get('word_count')} words, {metadata.get('character_count')} chars")
            
            # Step 3: Compress file
            compressed_path = None
            compression_stats = None
            
            if compress:
                print("\nStep 3: Compressing document...")
                try:
                    compressed_path, compression_stats = self.compress_file(file_path)
                    result['compressed_file'] = compressed_path
                    result['compression_stats'] = compression_stats
                    print(f"✓ Compressed: {compression_stats.get('compression_ratio')} reduction")
                except Exception as e:
                    print(f"⚠ Compression failed: {e}")
                    result['compression_error'] = str(e)
            else:
                print("\nStep 3: Skipping compression (not requested)")
            
            # Step 4: Upload to S3
            print("\nStep 4: Uploading to S3...")
            upload_path = compressed_path if compressed_path else file_path
            file_ext = '.gz' if compressed_path else Path(file_path).suffix
            s3_key = f"documents/{file_id}{file_ext}"
            
            s3_info = self.s3_storage.upload_file(
                upload_path,
                s3_key=s3_key,
                metadata={
                    'file_id': file_id,
                    'original_name': os.path.basename(file_path),
                    'type': 'document',
                }
            )
            
            if s3_info.get('success'):
                result['s3_info'] = s3_info
                print(f"✓ Uploaded to S3: {s3_key}")
            else:
                print(f"⚠ S3 upload failed: {s3_info.get('error')}")
                result['s3_error'] = s3_info.get('error')
            
            # Step 5: Chunk text and generate embeddings
            embedding_info = None
            
            if generate_embeddings:
                print("\nStep 5: Generating embeddings...")
                try:
                    # Chunk the text
                    chunks = self.chunk_text(text_content, chunk_size=512)
                    print(f"✓ Created {len(chunks)} text chunks")
                    
                    # Generate embeddings for each chunk
                    chunk_embeddings = self.embedding_model.encode(chunks)
                    
                    # Store each chunk embedding in Pinecone
                    for idx, (chunk, embedding) in enumerate(zip(chunks, chunk_embeddings)):
                        chunk_id = f"{file_id}_chunk_{idx}"
                        
                        pinecone_metadata = {
                            'file_id': file_id,
                            'type': 'document',
                            'chunk_index': idx,
                            'chunk_text': chunk[:200],  # Store preview
                            'file_extension': metadata.get('file_extension', ''),
                            'original_name': os.path.basename(file_path),
                        }
                        
                        self.pinecone_storage.upsert_embedding(
                            file_id=chunk_id,
                            embedding=embedding.tolist(),
                            metadata=pinecone_metadata
                        )
                    
                    embedding_info = {
                        'dimension': len(chunk_embeddings[0]),
                        'num_chunks': len(chunks),
                        'model': 'all-MiniLM-L6-v2',
                        'stored_in_pinecone': True,
                    }
                    result['embedding_info'] = embedding_info
                    print(f"✓ Generated {len(chunks)} chunk embeddings ({len(chunk_embeddings[0])} dimensions)")
                    
                except Exception as e:
                    print(f"⚠ Embedding generation failed: {e}")
                    result['embedding_error'] = str(e)
            else:
                print("\nStep 5: Skipping embeddings (not requested)")
            
            # Step 6: Store metadata in MongoDB
            print("\nStep 6: Storing metadata in database...")
            
            db_result = self.db_storage.insert_media(
                file_id=file_id,
                metadata=metadata,
                s3_info=s3_info or {},
                embedding_info=embedding_info
            )
            
            if db_result.get('success'):
                result['db_info'] = db_result
                print(f"✓ Metadata stored in MongoDB")
            else:
                print(f"⚠ Database storage failed: {db_result.get('error')}")
                result['db_error'] = db_result.get('error')
            
            print(f"\n{'='*60}")
            print(f"✓ Document processing complete for {file_id}")
            print(f"{'='*60}\n")
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Document processing failed: {str(e)}",
                'file_path': file_path,
            }


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Initialize processor
        processor = DocumentProcessor()
        
        # Process document
        result = processor.process_document(file_path)
        
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
                print(f"Embeddings: {result['embedding_info']['num_chunks']} chunks")
        else:
            print(f"❌ Failed: {result.get('error')}")
        
        print("="*60)
    else:
        print("Usage: python document_pipeline.py <file_path>")
        print("\nExample: python document_pipeline.py /path/to/document.pdf")

