"""
Structured Data Pipeline for JSON/CSV/XML files
Handles schema inference, data validation, and SQL/NoSQL routing
"""
import os
import uuid
import json
import csv
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Optional
import hashlib
import gzip
from datetime import datetime

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

from config import Config
from storage_s3 import S3Storage
from storage_db import get_db_storage


class StructuredDataProcessor:
    """Process structured data (JSON, CSV, XML)"""
    
    def __init__(self):
        """Initialize structured data processor"""
        print("Initializing Structured Data Processor...")
        
        # Initialize storage backends
        self.s3_storage = S3Storage()
        self.db_storage = get_db_storage()
        
        # Initialize Supabase if available (for SQL storage)
        self._supabase_client = None
        
        print("Structured Data Processor initialized!")
    
    def get_supabase_client(self) -> Optional[Client]:
        """Get Supabase client for SQL storage"""
        if self._supabase_client is None:
            # Check if Supabase SQL credentials are available
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_KEY")
            
            if supabase_url and supabase_key and SUPABASE_AVAILABLE:
                try:
                    self._supabase_client = create_client(supabase_url, supabase_key)
                    print("Connected to Supabase SQL!")
                except Exception as e:
                    print(f"Warning: Could not connect to Supabase SQL: {e}")
        
        return self._supabase_client
    
    def parse_json(self, file_path: str) -> Any:
        """Parse JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON file: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing JSON: {str(e)}")
    
    def parse_csv(self, file_path: str) -> Dict[str, Any]:
        """Parse CSV file"""
        try:
            if PANDAS_AVAILABLE:
                df = pd.read_csv(file_path)
                return {
                    'columns': df.columns.tolist(),
                    'data': df.to_dict(orient='records'),
                    'row_count': len(df),
                    'column_count': len(df.columns),
                }
            else:
                # Fallback to csv module
                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    data = list(reader)
                    columns = list(data[0].keys()) if data else []
                    
                    return {
                        'columns': columns,
                        'data': data,
                        'row_count': len(data),
                        'column_count': len(columns),
                    }
        except Exception as e:
            raise Exception(f"Error parsing CSV: {str(e)}")
    
    def parse_xml(self, file_path: str) -> Dict[str, Any]:
        """Parse XML file"""
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            def element_to_dict(element):
                """Convert XML element to dictionary"""
                result = {
                    'tag': element.tag,
                    'attributes': element.attrib,
                }
                
                # Add text content if present
                if element.text and element.text.strip():
                    result['text'] = element.text.strip()
                
                # Add children
                children = list(element)
                if children:
                    result['children'] = [element_to_dict(child) for child in children]
                
                return result
            
            return {
                'root': element_to_dict(root),
                'root_tag': root.tag,
            }
            
        except ET.ParseError as e:
            raise Exception(f"Invalid XML file: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing XML: {str(e)}")
    
    def infer_schema(self, data: Any, file_type: str) -> Dict[str, Any]:
        """
        Infer schema from structured data
        
        Args:
            data: Parsed data
            file_type: Type of file (json, csv, xml)
            
        Returns:
            Schema information
        """
        schema = {
            'file_type': file_type,
            'is_tabular': False,
            'is_nested': False,
            'is_uniform': False,
        }
        
        if file_type == 'csv':
            # CSV is always tabular
            schema['is_tabular'] = True
            schema['is_uniform'] = True
            schema['columns'] = data.get('columns', [])
            schema['row_count'] = data.get('row_count', 0)
            
            # Infer column types from first few rows
            if data.get('data'):
                sample = data['data'][:10]
                column_types = {}
                
                for col in schema['columns']:
                    values = [row.get(col) for row in sample if row.get(col)]
                    
                    if values:
                        # Try to infer type
                        sample_val = values[0]
                        if isinstance(sample_val, (int, float)):
                            column_types[col] = 'numeric'
                        elif isinstance(sample_val, bool):
                            column_types[col] = 'boolean'
                        else:
                            # Check if it's a number string
                            try:
                                float(sample_val)
                                column_types[col] = 'numeric'
                            except (ValueError, TypeError):
                                column_types[col] = 'text'
                    else:
                        column_types[col] = 'text'
                
                schema['column_types'] = column_types
        
        elif file_type == 'json':
            # Analyze JSON structure
            if isinstance(data, list):
                schema['is_array'] = True
                
                if data and isinstance(data[0], dict):
                    # Array of objects - potentially tabular
                    first_keys = set(data[0].keys())
                    is_uniform = all(set(item.keys()) == first_keys for item in data if isinstance(item, dict))
                    
                    if is_uniform:
                        schema['is_tabular'] = True
                        schema['is_uniform'] = True
                        schema['columns'] = list(first_keys)
                        schema['row_count'] = len(data)
                    else:
                        schema['is_nested'] = True
                else:
                    schema['is_nested'] = True
            
            elif isinstance(data, dict):
                schema['is_object'] = True
                
                # Check for nested structures
                def has_nested_structures(obj, depth=0, max_depth=3):
                    if depth > max_depth:
                        return False
                    
                    if isinstance(obj, dict):
                        for value in obj.values():
                            if isinstance(value, (dict, list)):
                                return True
                            if isinstance(value, dict):
                                if has_nested_structures(value, depth + 1, max_depth):
                                    return True
                    
                    return False
                
                schema['is_nested'] = has_nested_structures(data)
                schema['keys'] = list(data.keys())
        
        elif file_type == 'xml':
            schema['is_nested'] = True
            schema['root_tag'] = data.get('root_tag', '')
        
        return schema
    
    def decide_storage_backend(self, schema: Dict[str, Any]) -> str:
        """
        Decide which storage backend to use based on schema
        
        Args:
            schema: Inferred schema
            
        Returns:
            Storage backend ('sql' or 'nosql')
        """
        # Decision logic from project plan:
        # - Tabular and uniform → SQL (Supabase)
        # - Nested or irregular → NoSQL (MongoDB)
        
        if schema.get('is_tabular') and schema.get('is_uniform'):
            return 'sql'
        else:
            return 'nosql'
    
    def compress_file(self, file_path: str, output_path: Optional[str] = None) -> tuple:
        """
        Compress file using gzip
        
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
    
    def store_in_supabase(self, file_id: str, data: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store tabular data in Supabase SQL
        
        Args:
            file_id: File identifier
            data: Parsed data
            schema: Schema information
            
        Returns:
            Storage result
        """
        try:
            supabase = self.get_supabase_client()
            
            if not supabase:
                return {
                    'success': False,
                    'error': 'Supabase not available',
                    'fallback_to_nosql': True,
                }
            
            # Store in 'structured_data' table
            # Note: The table should be created beforehand (see KEYS_NEEDED.md)
            
            # For CSV/tabular JSON, store rows
            if schema.get('is_tabular'):
                rows_to_insert = []
                
                if schema['file_type'] == 'csv':
                    for idx, row in enumerate(data['data']):
                        rows_to_insert.append({
                            'file_id': file_id,
                            'row_index': idx,
                            'row_data': json.dumps(row),
                            'created_at': datetime.utcnow().isoformat(),
                        })
                elif schema['file_type'] == 'json' and isinstance(data, list):
                    for idx, row in enumerate(data):
                        rows_to_insert.append({
                            'file_id': file_id,
                            'row_index': idx,
                            'row_data': json.dumps(row),
                            'created_at': datetime.utcnow().isoformat(),
                        })
                
                # Insert in batches
                batch_size = 100
                for i in range(0, len(rows_to_insert), batch_size):
                    batch = rows_to_insert[i:i + batch_size]
                    result = supabase.table('structured_data').insert(batch).execute()
                
                return {
                    'success': True,
                    'storage': 'supabase_sql',
                    'rows_inserted': len(rows_to_insert),
                    'table': 'structured_data',
                }
            
            return {
                'success': False,
                'error': 'Data is not tabular',
                'fallback_to_nosql': True,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fallback_to_nosql': True,
            }
    
    def extract_metadata(self, file_path: str, parsed_data: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata from structured data file"""
        file_ext = Path(file_path).suffix.lower()
        
        metadata = {
            'type': 'structured_data',
            'file_type': 'structured_data',
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': file_ext,
            'extension': file_ext,
            'extracted_at': datetime.utcnow().isoformat(),
            'schema': schema,
        }
        
        # Compute SHA-256 hash for deduplication
        with open(file_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        metadata['sha256_hash'] = file_hash
        
        return metadata
    
    def process_structured_data(self, file_path: str,
                               compress: bool = True,
                               custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process structured data through complete pipeline
        
        Args:
            file_path: Path to data file
            compress: Whether to compress the file
            custom_metadata: Additional metadata
            
        Returns:
            Processing result dictionary
        """
        try:
            file_path = str(Path(file_path).absolute())
            file_id = str(uuid.uuid4())
            file_ext = Path(file_path).suffix.lower()
            
            print(f"\n{'='*60}")
            print(f"Processing structured data: {os.path.basename(file_path)}")
            print(f"File ID: {file_id}")
            print(f"{'='*60}\n")
            
            result = {
                'file_id': file_id,
                'original_file': file_path,
                'success': True,
            }
            
            # Step 1: Parse file
            print("Step 1: Parsing structured data...")
            
            if file_ext == '.json':
                parsed_data = self.parse_json(file_path)
                file_type = 'json'
            elif file_ext == '.csv':
                parsed_data = self.parse_csv(file_path)
                file_type = 'csv'
            elif file_ext == '.xml':
                parsed_data = self.parse_xml(file_path)
                file_type = 'xml'
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")
            
            print(f"✓ Parsed {file_type.upper()} file")
            
            # Step 2: Infer schema
            print("\nStep 2: Inferring schema...")
            schema = self.infer_schema(parsed_data, file_type)
            print(f"✓ Schema inferred: tabular={schema.get('is_tabular')}, nested={schema.get('is_nested')}")
            
            # Step 3: Extract metadata
            print("\nStep 3: Extracting metadata...")
            metadata = self.extract_metadata(file_path, parsed_data, schema)
            
            if custom_metadata:
                metadata['custom'] = custom_metadata
            
            result['metadata'] = metadata
            print(f"✓ Metadata extracted")
            
            # Step 4: Decide storage backend
            storage_backend = self.decide_storage_backend(schema)
            print(f"\nStep 4: Storage decision: {storage_backend.upper()}")
            result['storage_backend'] = storage_backend
            
            # Step 5: Compress file
            compressed_path = None
            compression_stats = None
            
            if compress:
                print("\nStep 5: Compressing file...")
                try:
                    compressed_path, compression_stats = self.compress_file(file_path)
                    result['compressed_file'] = compressed_path
                    result['compression_stats'] = compression_stats
                    print(f"✓ Compressed: {compression_stats.get('compression_ratio')} reduction")
                except Exception as e:
                    print(f"⚠ Compression failed: {e}")
                    result['compression_error'] = str(e)
            else:
                print("\nStep 5: Skipping compression (not requested)")
            
            # Step 6: Upload compressed file to S3
            print("\nStep 6: Uploading to S3...")
            upload_path = compressed_path if compressed_path else file_path
            upload_ext = '.gz' if compressed_path else file_ext
            s3_key = f"structured_data/{file_id}{upload_ext}"
            
            s3_info = self.s3_storage.upload_file(
                upload_path,
                s3_key=s3_key,
                metadata={
                    'file_id': file_id,
                    'original_name': os.path.basename(file_path),
                    'type': 'structured_data',
                }
            )
            
            if s3_info.get('success'):
                result['s3_info'] = s3_info
                print(f"✓ Uploaded to S3: {s3_key}")
            else:
                print(f"⚠ S3 upload failed: {s3_info.get('error')}")
                result['s3_error'] = s3_info.get('error')
            
            # Step 7: Store parsed data in appropriate backend
            print(f"\nStep 7: Storing data in {storage_backend.upper()}...")
            
            data_storage_result = None
            
            if storage_backend == 'sql':
                # Try to store in Supabase SQL
                data_storage_result = self.store_in_supabase(file_id, parsed_data, schema)
                
                if data_storage_result.get('fallback_to_nosql'):
                    print("⚠ Supabase SQL not available, falling back to MongoDB")
                    storage_backend = 'nosql'
                elif data_storage_result.get('success'):
                    print(f"✓ Data stored in Supabase SQL: {data_storage_result.get('rows_inserted', 0)} rows")
                    result['data_storage'] = data_storage_result
            
            if storage_backend == 'nosql':
                # Store in MongoDB (always available)
                # Store the parsed data along with metadata
                metadata['parsed_data'] = parsed_data
                print(f"✓ Data will be stored in MongoDB with metadata")
            
            # Step 8: Store metadata in MongoDB
            print("\nStep 8: Storing metadata in MongoDB...")
            
            db_result = self.db_storage.insert_media(
                file_id=file_id,
                metadata=metadata,
                s3_info=s3_info or {},
                embedding_info={'storage_backend': storage_backend}
            )
            
            if db_result.get('success'):
                result['db_info'] = db_result
                print(f"✓ Metadata stored in MongoDB")
            else:
                print(f"⚠ Database storage failed: {db_result.get('error')}")
                result['db_error'] = db_result.get('error')
            
            print(f"\n{'='*60}")
            print(f"✓ Structured data processing complete for {file_id}")
            print(f"{'='*60}\n")
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Structured data processing failed: {str(e)}",
                'file_path': file_path,
            }


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Initialize processor
        processor = StructuredDataProcessor()
        
        # Process file
        result = processor.process_structured_data(file_path)
        
        # Print summary
        print("\n" + "="*60)
        print("PROCESSING SUMMARY")
        print("="*60)
        
        if result.get('success'):
            print(f"✓ Success!")
            print(f"File ID: {result['file_id']}")
            print(f"Storage Backend: {result.get('storage_backend', 'N/A')}")
            
            if 'compression_stats' in result:
                print(f"Compression: {result['compression_stats']['compression_ratio']}")
        else:
            print(f"❌ Failed: {result.get('error')}")
        
        print("="*60)
    else:
        print("Usage: python structured_data_pipeline.py <file_path>")
        print("\nExample: python structured_data_pipeline.py /path/to/data.json")

