"""
Code Pipeline for source code files (.py, .java, .cpp, .js, etc.)
Handles code parsing, metadata extraction, and semantic code search
"""
import os
import uuid
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import hashlib
import gzip
from datetime import datetime

try:
    from transformers import AutoTokenizer, AutoModel
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

from config import Config
from storage_s3 import S3Storage
from storage_db import get_db_storage
from storage_pinecone import PineconeStorage


class CodeProcessor:
    """Process source code files"""
    
    # Supported code extensions and their language names
    CODE_LANGUAGES = {
        '.py': 'Python',
        '.java': 'Java',
        '.cpp': 'C++',
        '.c': 'C',
        '.hpp': 'C++',
        '.h': 'C/C++',
        '.js': 'JavaScript',
        '.jsx': 'JavaScript',
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript',
        '.go': 'Go',
        '.rs': 'Rust',
        '.rb': 'Ruby',
        '.php': 'PHP',
        '.swift': 'Swift',
        '.kt': 'Kotlin',
        '.scala': 'Scala',
        '.r': 'R',
        '.m': 'Objective-C',
        '.cs': 'C#',
        '.sh': 'Shell',
        '.bash': 'Bash',
        '.sql': 'SQL',
        '.html': 'HTML',
        '.css': 'CSS',
        '.vue': 'Vue',
        '.dart': 'Dart',
        '.lua': 'Lua',
        '.pl': 'Perl',
        '.ipynb': 'Jupyter Notebook',
    }
    
    def __init__(self):
        """Initialize code processor"""
        print("Initializing Code Processor...")
        
        # Initialize storage backends
        self.s3_storage = S3Storage()
        self.db_storage = get_db_storage()
        self.pinecone_storage = PineconeStorage()
        
        # Lazy load CodeBERT model
        self._tokenizer = None
        self._model = None
        
        print("Code Processor initialized!")
    
    def load_codebert_model(self):
        """Lazy load CodeBERT model"""
        if self._model is None:
            if not TRANSFORMERS_AVAILABLE:
                raise ImportError("transformers not installed. Install with: pip install transformers torch")
            
            print("Loading CodeBERT model...")
            model_name = "microsoft/codebert-base"
            
            try:
                self._tokenizer = AutoTokenizer.from_pretrained(model_name)
                self._model = AutoModel.from_pretrained(model_name)
                self._model.eval()
                print("CodeBERT model loaded successfully!")
            except Exception as e:
                print(f"Warning: Could not load CodeBERT: {e}")
                print("Code embeddings will not be available")
    
    def read_code_file(self, file_path: str) -> str:
        """Read code file with proper encoding"""
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
        
        # If all encodings fail, read with errors='ignore'
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    
    def extract_code_metadata(self, file_path: str, code_content: str) -> Dict[str, Any]:
        """Extract metadata from code file"""
        file_ext = Path(file_path).suffix.lower()
        language = self.CODE_LANGUAGES.get(file_ext, 'Unknown')
        
        metadata = {
            'type': 'code',
            'file_type': 'code',
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': file_ext,
            'extension': file_ext,
            'language': language,
            'extracted_at': datetime.utcnow().isoformat(),
            'line_count': len(code_content.split('\n')),
            'character_count': len(code_content),
        }
        
        # Parse code structure
        try:
            if file_ext == '.py':
                metadata['code_structure'] = self._parse_python(code_content)
            elif file_ext in ['.js', '.jsx', '.ts', '.tsx']:
                metadata['code_structure'] = self._parse_javascript(code_content)
            elif file_ext in ['.java']:
                metadata['code_structure'] = self._parse_java(code_content)
            elif file_ext in ['.cpp', '.c', '.hpp', '.h']:
                metadata['code_structure'] = self._parse_cpp(code_content)
            else:
                metadata['code_structure'] = self._parse_generic(code_content)
        except Exception as e:
            metadata['parse_error'] = str(e)
            metadata['code_structure'] = self._parse_generic(code_content)
        
        # Compute SHA-256 hash for deduplication
        file_hash = hashlib.sha256(code_content.encode('utf-8')).hexdigest()
        metadata['sha256_hash'] = file_hash
        
        return metadata
    
    def _parse_python(self, code: str) -> Dict[str, Any]:
        """Parse Python code structure"""
        structure = {
            'imports': [],
            'functions': [],
            'classes': [],
            'comments': [],
        }
        
        # Extract imports
        import_pattern = r'^(?:from\s+[\w.]+\s+)?import\s+[\w\s,.*]+$'
        structure['imports'] = re.findall(import_pattern, code, re.MULTILINE)
        
        # Extract function definitions
        func_pattern = r'def\s+(\w+)\s*\('
        structure['functions'] = re.findall(func_pattern, code)
        
        # Extract class definitions
        class_pattern = r'class\s+(\w+)'
        structure['classes'] = re.findall(class_pattern, code)
        
        # Extract docstrings and comments
        docstring_pattern = r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\''
        structure['docstrings'] = re.findall(docstring_pattern, code)
        
        comment_pattern = r'#.*$'
        structure['comments'] = re.findall(comment_pattern, code, re.MULTILINE)
        
        return structure
    
    def _parse_javascript(self, code: str) -> Dict[str, Any]:
        """Parse JavaScript/TypeScript code structure"""
        structure = {
            'imports': [],
            'functions': [],
            'classes': [],
            'comments': [],
        }
        
        # Extract imports
        import_pattern = r'import\s+.*?from\s+["\'].*?["\']|require\(["\'].*?["\']\)'
        structure['imports'] = re.findall(import_pattern, code)
        
        # Extract function definitions
        func_pattern = r'function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*:\s*(?:async\s*)?\('
        matches = re.findall(func_pattern, code)
        structure['functions'] = [match for group in matches for match in group if match]
        
        # Extract class definitions
        class_pattern = r'class\s+(\w+)'
        structure['classes'] = re.findall(class_pattern, code)
        
        # Extract comments
        single_comment_pattern = r'//.*$'
        multi_comment_pattern = r'/\*[\s\S]*?\*/'
        structure['comments'] = (
            re.findall(single_comment_pattern, code, re.MULTILINE) +
            re.findall(multi_comment_pattern, code)
        )
        
        return structure
    
    def _parse_java(self, code: str) -> Dict[str, Any]:
        """Parse Java code structure"""
        structure = {
            'imports': [],
            'functions': [],
            'classes': [],
            'interfaces': [],
        }
        
        # Extract imports
        import_pattern = r'import\s+[\w.]+;'
        structure['imports'] = re.findall(import_pattern, code)
        
        # Extract method definitions
        method_pattern = r'(?:public|private|protected)?\s+(?:static\s+)?(?:\w+\s+)+(\w+)\s*\('
        structure['functions'] = re.findall(method_pattern, code)
        
        # Extract class definitions
        class_pattern = r'class\s+(\w+)'
        structure['classes'] = re.findall(class_pattern, code)
        
        # Extract interface definitions
        interface_pattern = r'interface\s+(\w+)'
        structure['interfaces'] = re.findall(interface_pattern, code)
        
        return structure
    
    def _parse_cpp(self, code: str) -> Dict[str, Any]:
        """Parse C/C++ code structure"""
        structure = {
            'includes': [],
            'functions': [],
            'classes': [],
            'structs': [],
        }
        
        # Extract includes
        include_pattern = r'#include\s+[<"].*?[>"]'
        structure['includes'] = re.findall(include_pattern, code)
        
        # Extract function definitions
        func_pattern = r'(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*{'
        structure['functions'] = re.findall(func_pattern, code)
        
        # Extract class definitions
        class_pattern = r'class\s+(\w+)'
        structure['classes'] = re.findall(class_pattern, code)
        
        # Extract struct definitions
        struct_pattern = r'struct\s+(\w+)'
        structure['structs'] = re.findall(struct_pattern, code)
        
        return structure
    
    def _parse_generic(self, code: str) -> Dict[str, Any]:
        """Generic code parsing for unsupported languages"""
        structure = {
            'line_count': len(code.split('\n')),
            'non_empty_lines': len([line for line in code.split('\n') if line.strip()]),
            'comment_lines': 0,
        }
        
        # Try to count comment lines (common patterns)
        comment_patterns = [r'//.*$', r'#.*$', r'/\*[\s\S]*?\*/']
        for pattern in comment_patterns:
            matches = re.findall(pattern, code, re.MULTILINE)
            structure['comment_lines'] += len(matches)
        
        return structure
    
    def generate_code_embedding(self, code_content: str) -> Optional[List[float]]:
        """Generate embedding for code using CodeBERT"""
        try:
            self.load_codebert_model()
            
            if self._model is None or self._tokenizer is None:
                return None
            
            # Truncate code to max token length (512 tokens)
            tokens = self._tokenizer.encode(
                code_content,
                truncation=True,
                max_length=512,
                return_tensors='pt'
            )
            
            with torch.no_grad():
                outputs = self._model(tokens)
                # Use [CLS] token embedding
                embedding = outputs.last_hidden_state[:, 0, :].squeeze().numpy()
            
            return embedding.tolist()
            
        except Exception as e:
            print(f"Warning: Code embedding generation failed: {e}")
            return None
    
    def compress_file(self, file_path: str, output_path: Optional[str] = None) -> tuple:
        """Compress code file using zstd-compatible gzip"""
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
    
    def process_code_file(self, file_path: str,
                         compress: bool = True,
                         generate_embeddings: bool = True,
                         custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process code file through complete pipeline
        
        Args:
            file_path: Path to code file
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
            print(f"Processing code file: {os.path.basename(file_path)}")
            print(f"File ID: {file_id}")
            print(f"{'='*60}\n")
            
            result = {
                'file_id': file_id,
                'original_file': file_path,
                'success': True,
            }
            
            # Step 1: Read code content
            print("Step 1: Reading code file...")
            code_content = self.read_code_file(file_path)
            print(f"✓ Read {len(code_content)} characters")
            
            # Step 2: Extract metadata
            print("\nStep 2: Extracting code metadata...")
            metadata = self.extract_code_metadata(file_path, code_content)
            
            if custom_metadata:
                metadata['custom'] = custom_metadata
            
            result['metadata'] = metadata
            print(f"✓ Metadata extracted: {metadata.get('language')} - {metadata.get('line_count')} lines")
            
            # Step 3: Compress file
            compressed_path = None
            compression_stats = None
            
            if compress:
                print("\nStep 3: Compressing code file...")
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
            s3_key = f"code/{file_id}{file_ext}"
            
            s3_info = self.s3_storage.upload_file(
                upload_path,
                s3_key=s3_key,
                metadata={
                    'file_id': file_id,
                    'original_name': os.path.basename(file_path),
                    'type': 'code',
                }
            )
            
            if s3_info.get('success'):
                result['s3_info'] = s3_info
                print(f"✓ Uploaded to S3: {s3_key}")
            else:
                print(f"⚠ S3 upload failed: {s3_info.get('error')}")
                result['s3_error'] = s3_info.get('error')
            
            # Step 5: Generate embeddings
            embedding_info = None
            
            if generate_embeddings:
                print("\nStep 5: Generating code embeddings...")
                try:
                    embedding = self.generate_code_embedding(code_content)
                    
                    if embedding:
                        # Store in Pinecone
                        pinecone_metadata = {
                            'file_id': file_id,
                            'type': 'code',
                            'language': metadata.get('language', ''),
                            'file_extension': metadata.get('file_extension', ''),
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
                                'model': 'codebert-base',
                                'stored_in_pinecone': True,
                            }
                            result['embedding_info'] = embedding_info
                            print(f"✓ Embedding generated and stored ({len(embedding)} dimensions)")
                        else:
                            print(f"⚠ Pinecone storage failed: {pinecone_result.get('error')}")
                            result['embedding_error'] = pinecone_result.get('error')
                    else:
                        print("⚠ Embedding generation skipped (CodeBERT not available)")
                        
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
            print(f"✓ Code processing complete for {file_id}")
            print(f"{'='*60}\n")
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Code processing failed: {str(e)}",
                'file_path': file_path,
            }


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Initialize processor
        processor = CodeProcessor()
        
        # Process code file
        result = processor.process_code_file(file_path)
        
        # Print summary
        print("\n" + "="*60)
        print("PROCESSING SUMMARY")
        print("="*60)
        
        if result.get('success'):
            print(f"✓ Success!")
            print(f"File ID: {result['file_id']}")
            print(f"Language: {result['metadata'].get('language', 'N/A')}")
            
            if 'compression_stats' in result:
                print(f"Compression: {result['compression_stats']['compression_ratio']}")
            
            if 'embedding_info' in result:
                print(f"Embedding: {result['embedding_info']['dimension']} dimensions")
        else:
            print(f"❌ Failed: {result.get('error')}")
        
        print("="*60)
    else:
        print("Usage: python code_pipeline.py <file_path>")
        print("\nExample: python code_pipeline.py /path/to/script.py")

