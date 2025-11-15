"""
Decision Engine / File Router
Intelligently routes files to appropriate processing pipelines
"""
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

from media_pipeline import MediaProcessor
from document_pipeline import DocumentProcessor
from structured_data_pipeline import StructuredDataProcessor
from code_pipeline import CodeProcessor
from generic_pipeline import GenericProcessor


class DecisionEngine:
    """
    Intelligent file router that determines which pipeline to use
    based on file type and characteristics
    """
    
    # File extension mappings to pipeline types
    MEDIA_EXTENSIONS = {
        # Images
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.svg',
        '.bmp', '.tiff', '.tif',
        # Videos
        '.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.wmv', '.m4v',
        # Audio
        '.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg', '.wma',
    }
    
    DOCUMENT_EXTENSIONS = {
        '.pdf', '.txt', '.doc', '.docx', '.docs', '.rtf', '.odt',
        '.md', '.ppt', '.pptx',
    }
    
    STRUCTURED_DATA_EXTENSIONS = {
        '.json', '.csv', '.xml', '.tsv', '.yaml', '.yml',
    }
    
    CODE_EXTENSIONS = {
        # Common programming languages
        '.py', '.java', '.cpp', '.c', '.hpp', '.h',
        '.js', '.jsx', '.ts', '.tsx',
        '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
        '.r', '.m', '.cs', '.sh', '.bash',
        '.sql', '.html', '.css', '.vue', '.dart', '.lua', '.pl',
        '.ipynb',
    }
    
    def __init__(self):
        """Initialize decision engine with all processors"""
        print("Initializing Decision Engine...")
        
        # Initialize all pipeline processors (lazy loading)
        self._media_processor = None
        self._document_processor = None
        self._structured_data_processor = None
        self._code_processor = None
        self._generic_processor = None
        
        print("Decision Engine initialized!")
    
    @property
    def media_processor(self) -> MediaProcessor:
        """Lazy load media processor"""
        if self._media_processor is None:
            self._media_processor = MediaProcessor()
        return self._media_processor
    
    @property
    def document_processor(self) -> DocumentProcessor:
        """Lazy load document processor"""
        if self._document_processor is None:
            self._document_processor = DocumentProcessor()
        return self._document_processor
    
    @property
    def structured_data_processor(self) -> StructuredDataProcessor:
        """Lazy load structured data processor"""
        if self._structured_data_processor is None:
            self._structured_data_processor = StructuredDataProcessor()
        return self._structured_data_processor
    
    @property
    def code_processor(self) -> CodeProcessor:
        """Lazy load code processor"""
        if self._code_processor is None:
            self._code_processor = CodeProcessor()
        return self._code_processor
    
    @property
    def generic_processor(self) -> GenericProcessor:
        """Lazy load generic processor"""
        if self._generic_processor is None:
            self._generic_processor = GenericProcessor()
        return self._generic_processor
    
    def determine_pipeline(self, file_path: str) -> Tuple[str, str]:
        """
        Determine which pipeline to use for a file
        
        Args:
            file_path: Path to file
            
        Returns:
            Tuple of (pipeline_name, pipeline_description)
        """
        file_ext = Path(file_path).suffix.lower()
        
        # Decision tree logic from project plan:
        # if file_ext in ['jpg', 'png', 'mp4', 'mov']:
        #     handle_media_pipeline()
        # elif file_ext in ['pdf', 'txt', 'docx']:
        #     handle_document_pipeline()
        # elif file_ext in ['json', 'csv', 'xml']:
        #     handle_structured_data_pipeline()
        # elif file_ext in ['py', 'java', 'cpp', 'js', 'ipynb']:
        #     handle_code_pipeline()
        # else:
        #     handle_generic_pipeline()
        
        if file_ext in self.MEDIA_EXTENSIONS:
            return 'media', 'Media Pipeline (Images/Videos/Audio)'
        
        elif file_ext in self.DOCUMENT_EXTENSIONS:
            return 'document', 'Document Pipeline (PDF/TXT/DOCX)'
        
        elif file_ext in self.STRUCTURED_DATA_EXTENSIONS:
            return 'structured_data', 'Structured Data Pipeline (JSON/CSV/XML)'
        
        elif file_ext in self.CODE_EXTENSIONS:
            return 'code', 'Code Pipeline (Source Code)'
        
        else:
            return 'generic', 'Generic Pipeline (Unknown/Other)'
    
    def route_and_process(self, file_path: str,
                         compress: bool = True,
                         generate_embeddings: bool = True,
                         custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Route file to appropriate pipeline and process it
        
        Args:
            file_path: Path to file
            compress: Whether to compress the file
            generate_embeddings: Whether to generate embeddings
            custom_metadata: Additional metadata
            
        Returns:
            Processing result dictionary
        """
        try:
            # Determine which pipeline to use
            pipeline_name, pipeline_description = self.determine_pipeline(file_path)
            
            print(f"\n{'='*70}")
            print(f"DECISION ENGINE: Routing file to {pipeline_description}")
            print(f"File: {Path(file_path).name}")
            print(f"Pipeline: {pipeline_name}")
            print(f"{'='*70}")
            
            # Add pipeline info to custom metadata
            if custom_metadata is None:
                custom_metadata = {}
            custom_metadata['pipeline'] = pipeline_name
            custom_metadata['pipeline_description'] = pipeline_description
            
            # Route to appropriate pipeline
            if pipeline_name == 'media':
                result = self.media_processor.process_media_file(
                    file_path=file_path,
                    compress=compress,
                    generate_embeddings=generate_embeddings,
                    custom_metadata=custom_metadata
                )
            
            elif pipeline_name == 'document':
                result = self.document_processor.process_document(
                    file_path=file_path,
                    compress=compress,
                    generate_embeddings=generate_embeddings,
                    custom_metadata=custom_metadata
                )
            
            elif pipeline_name == 'structured_data':
                result = self.structured_data_processor.process_structured_data(
                    file_path=file_path,
                    compress=compress,
                    custom_metadata=custom_metadata
                )
            
            elif pipeline_name == 'code':
                result = self.code_processor.process_code_file(
                    file_path=file_path,
                    compress=compress,
                    generate_embeddings=generate_embeddings,
                    custom_metadata=custom_metadata
                )
            
            elif pipeline_name == 'generic':
                result = self.generic_processor.process_generic_file(
                    file_path=file_path,
                    compress=compress,
                    custom_metadata=custom_metadata
                )
            
            else:
                return {
                    'success': False,
                    'error': f'Unknown pipeline: {pipeline_name}',
                }
            
            # Add pipeline info to result
            result['pipeline'] = pipeline_name
            result['pipeline_description'] = pipeline_description
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Decision engine error: {str(e)}',
                'file_path': file_path,
            }
    
    def get_pipeline_info(self) -> Dict[str, Any]:
        """
        Get information about all available pipelines
        
        Returns:
            Dictionary with pipeline information
        """
        return {
            'media': {
                'description': 'Media Pipeline for images, videos, and audio',
                'extensions': list(self.MEDIA_EXTENSIONS),
                'features': [
                    'EXIF/metadata extraction',
                    'Compression (WebP, H.265, AAC)',
                    'CLIP embeddings for visual content',
                    'Semantic search capability',
                ],
                'storage': ['S3', 'MongoDB', 'Pinecone'],
            },
            'document': {
                'description': 'Document Pipeline for text documents',
                'extensions': list(self.DOCUMENT_EXTENSIONS),
                'features': [
                    'Text extraction',
                    'Content chunking',
                    'SentenceTransformer embeddings',
                    'Semantic document search',
                ],
                'storage': ['S3', 'MongoDB', 'Pinecone'],
            },
            'structured_data': {
                'description': 'Structured Data Pipeline for tabular/hierarchical data',
                'extensions': list(self.STRUCTURED_DATA_EXTENSIONS),
                'features': [
                    'Schema inference',
                    'SQL/NoSQL routing decision',
                    'Data validation',
                    'Optimal storage selection',
                ],
                'storage': ['S3', 'MongoDB', 'Supabase SQL (for tabular data)'],
            },
            'code': {
                'description': 'Code Pipeline for source code files',
                'extensions': list(self.CODE_EXTENSIONS),
                'features': [
                    'Code structure parsing',
                    'Function/class extraction',
                    'CodeBERT embeddings',
                    'Semantic code search',
                ],
                'storage': ['S3', 'MongoDB', 'Pinecone'],
            },
            'generic': {
                'description': 'Generic Pipeline for unknown/other file types',
                'extensions': ['All other extensions'],
                'features': [
                    'MIME type detection',
                    'Hash-based deduplication',
                    'Compression (if beneficial)',
                    'Binary/text classification',
                ],
                'storage': ['S3', 'MongoDB'],
            },
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the system
        
        Returns:
            Dictionary with system statistics
        """
        try:
            stats = {
                'total_pipelines': 5,
                'available_pipelines': [
                    'media', 'document', 'structured_data', 'code', 'generic'
                ],
            }
            
            # Try to get database statistics
            if self._media_processor:
                try:
                    db_storage = self._media_processor.db_storage
                    # Get counts by type
                    all_media = db_storage.get_all_media(limit=1000)
                    
                    type_counts = {}
                    for item in all_media:
                        item_type = item.get('metadata', {}).get('type', 'unknown')
                        type_counts[item_type] = type_counts.get(item_type, 0) + 1
                    
                    stats['file_counts_by_type'] = type_counts
                    stats['total_files'] = len(all_media)
                except Exception as e:
                    stats['error'] = f"Could not fetch statistics: {str(e)}"
            
            return stats
            
        except Exception as e:
            return {
                'error': f'Error getting statistics: {str(e)}'
            }


if __name__ == "__main__":
    import sys
    import json
    
    engine = DecisionEngine()
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--info':
            # Print pipeline information
            print("\n" + "="*70)
            print("AVAILABLE PIPELINES")
            print("="*70 + "\n")
            
            info = engine.get_pipeline_info()
            for pipeline_name, pipeline_info in info.items():
                print(f"\n{pipeline_name.upper()}")
                print("-" * 70)
                print(f"Description: {pipeline_info['description']}")
                print(f"Extensions: {', '.join(pipeline_info['extensions'][:10])}")
                if len(pipeline_info['extensions']) > 10:
                    print(f"            ... and {len(pipeline_info['extensions']) - 10} more")
                print(f"Features:")
                for feature in pipeline_info['features']:
                    print(f"  • {feature}")
                print(f"Storage: {', '.join(pipeline_info['storage'])}")
            
            print("\n" + "="*70 + "\n")
        
        elif sys.argv[1] == '--stats':
            # Print system statistics
            stats = engine.get_statistics()
            print("\nSystem Statistics:")
            print(json.dumps(stats, indent=2))
        
        else:
            # Process a file
            file_path = sys.argv[1]
            
            # Determine pipeline
            pipeline_name, pipeline_desc = engine.determine_pipeline(file_path)
            print(f"\nFile: {Path(file_path).name}")
            print(f"Detected Pipeline: {pipeline_desc}")
            
            # Process file
            result = engine.route_and_process(file_path)
            
            # Print summary
            print("\n" + "="*70)
            print("PROCESSING SUMMARY")
            print("="*70)
            
            if result.get('success'):
                print(f"✓ Success!")
                print(f"File ID: {result['file_id']}")
                print(f"Pipeline: {result.get('pipeline', 'N/A')}")
            else:
                print(f"❌ Failed: {result.get('error')}")
            
            print("="*70 + "\n")
    
    else:
        print("Usage:")
        print("  python decision_engine.py <file_path>     # Process a file")
        print("  python decision_engine.py --info          # Show pipeline information")
        print("  python decision_engine.py --stats         # Show system statistics")
        print("\nExample: python decision_engine.py /path/to/file.pdf")

