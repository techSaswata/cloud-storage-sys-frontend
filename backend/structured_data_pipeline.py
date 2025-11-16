"""
Structured Data Pipeline for JSON/CSV/XML files
Advanced schema inference, SQL/NoSQL routing, automatic table/collection creation,
relationship detection, and intelligent indexing
"""
import os
import uuid
import json
import csv
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Tuple
import hashlib
import gzip
from datetime import datetime
from collections import defaultdict

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

try:
    import psycopg2
    from psycopg2.extras import Json
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

from config import Config
from storage_s3 import S3Storage
from storage_db import get_db_storage


# ============================================================================
# SCHEMA ANALYZER
# ============================================================================

class SchemaAnalyzer:
    """Analyzes JSON structure and infers schema"""
    
    @staticmethod
    def analyze_json_structure(data: Any, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Deep analysis of JSON structure to determine characteristics
        
        Args:
            data: Parsed JSON data (can be dict, list, or primitive)
            metadata: Optional metadata/hints from user
            
        Returns:
            Comprehensive analysis including structure type, nesting, uniformity
        """
        analysis = {
            'data_type': type(data).__name__,
            'is_array': isinstance(data, list),
            'is_object': isinstance(data, dict),
            'is_primitive': isinstance(data, (str, int, float, bool, type(None))),
            'is_tabular': False,
            'is_uniform': False,
            'is_nested': False,
            'is_hierarchical': False,
            'nesting_depth': 0,
            'has_arrays_in_objects': False,
            'has_repeated_structures': False,
            'relationship_candidates': [],
        }
        
        if isinstance(data, list):
            analysis.update(SchemaAnalyzer._analyze_array(data))
        elif isinstance(data, dict):
            analysis.update(SchemaAnalyzer._analyze_object(data))
        
        # Apply metadata hints if provided
        if metadata:
            analysis['metadata_hints'] = metadata
            SchemaAnalyzer._apply_metadata_hints(analysis, metadata)
        
        return analysis
    
    @staticmethod
    def _analyze_array(data: List[Any]) -> Dict[str, Any]:
        """Analyze array structure"""
        if not data:
            return {
                'is_tabular': False,
                'is_uniform': False,
                'is_nested': False,
                'array_length': 0,
            }
        
        result = {
            'array_length': len(data),
            'element_types': {},
        }
        
        # Analyze element types
        element_types = defaultdict(int)
        for item in data[:100]:  # Sample first 100 items
            element_types[type(item).__name__] += 1
        
        result['element_types'] = dict(element_types)
        
        # Check if array contains objects
        if all(isinstance(item, dict) for item in data):
            result.update(SchemaAnalyzer._analyze_array_of_objects(data))
        else:
            result['is_nested'] = any(isinstance(item, (dict, list)) for item in data)
        
        return result
    
    @staticmethod
    def _analyze_array_of_objects(data: List[Dict]) -> Dict[str, Any]:
        """Analyze array of objects (potential table)"""
        if not data:
            return {}
        
        # Collect all keys across all objects
        all_keys = set()
        key_counts = defaultdict(int)
        key_types = defaultdict(set)
        
        for obj in data:
            if isinstance(obj, dict):
                for key, value in obj.items():
                    all_keys.add(key)
                    key_counts[key] += 1
                    key_types[key].add(type(value).__name__)
        
        total_objects = len(data)
        
        # Check uniformity - do all objects have the same keys?
        first_keys = set(data[0].keys()) if data else set()
        is_uniform = all(set(obj.keys()) == first_keys for obj in data if isinstance(obj, dict))
        
        # Identify optional vs required fields
        required_fields = {k for k, count in key_counts.items() if count == total_objects}
        optional_fields = {k for k, count in key_counts.items() if count < total_objects}
        
        # Check for nested structures
        nested_fields = {k for k, types in key_types.items() if 'dict' in types or 'list' in types}
        
        # Calculate nesting depth
        max_depth = 0
        for obj in data[:10]:  # Sample
            depth = SchemaAnalyzer._calculate_nesting_depth(obj)
            max_depth = max(max_depth, depth)
        
        # Detect potential relationships (foreign keys)
        relationship_candidates = SchemaAnalyzer._detect_relationships(data, all_keys)
        
        return {
            'is_tabular': is_uniform and len(nested_fields) == 0,
            'is_uniform': is_uniform,
            'is_nested': len(nested_fields) > 0,
            'nesting_depth': max_depth,
            'all_keys': list(all_keys),
            'required_fields': list(required_fields),
            'optional_fields': list(optional_fields),
            'nested_fields': list(nested_fields),
            'key_types': {k: list(v) for k, v in key_types.items()},
            'relationship_candidates': relationship_candidates,
            'has_arrays_in_objects': any('list' in types for types in key_types.values()),
        }
    
    @staticmethod
    def _analyze_object(data: Dict) -> Dict[str, Any]:
        """Analyze single object structure"""
        keys = list(data.keys())
        key_types = {k: type(v).__name__ for k, v in data.items()}
        
        nested_keys = [k for k, v in data.items() if isinstance(v, (dict, list))]
        
        depth = SchemaAnalyzer._calculate_nesting_depth(data)
        
        return {
            'keys': keys,
            'key_types': key_types,
            'nested_keys': nested_keys,
            'is_nested': len(nested_keys) > 0,
            'nesting_depth': depth,
            'is_hierarchical': depth > 2,
        }
    
    @staticmethod
    def _calculate_nesting_depth(obj: Any, current_depth: int = 0) -> int:
        """Calculate maximum nesting depth"""
        if not isinstance(obj, (dict, list)):
            return current_depth
        
        if isinstance(obj, dict):
            if not obj:
                return current_depth
            return max(SchemaAnalyzer._calculate_nesting_depth(v, current_depth + 1) for v in obj.values())
        
        if isinstance(obj, list):
            if not obj:
                return current_depth
            return max(SchemaAnalyzer._calculate_nesting_depth(item, current_depth + 1) for item in obj[:10])
        
        return current_depth
    
    @staticmethod
    def _detect_relationships(data: List[Dict], all_keys: set) -> List[Dict[str, Any]]:
        """Detect potential foreign key relationships"""
        relationships = []
        
        # Look for keys that end with '_id', 'Id', or 'ID'
        id_fields = [k for k in all_keys if k.endswith('_id') or k.endswith('Id') or k.endswith('ID') or k == 'id']
        
        for field in id_fields:
            # Check if values are consistent types (likely foreign keys)
            sample_values = [obj.get(field) for obj in data[:50] if field in obj]
            
            if sample_values:
                value_types = set(type(v).__name__ for v in sample_values if v is not None)
                
                if len(value_types) == 1:  # Consistent type
                    relationships.append({
                        'field': field,
                        'type': list(value_types)[0],
                        'likely_foreign_key': True,
                        'inferred_table': field.replace('_id', '').replace('Id', '').replace('ID', ''),
                    })
        
        return relationships
    
    @staticmethod
    def _apply_metadata_hints(analysis: Dict[str, Any], metadata: Dict[str, Any]):
        """Apply user-provided metadata hints to improve analysis"""
        hints = metadata.get('hints', {})
        
        # Check for hints like "This is user data", "e-commerce order data", etc.
        description = metadata.get('description', '').lower()
        tags = metadata.get('tags', [])
        
        # Adjust decisions based on hints
        if 'schema_changes' in description or 'evolving' in description:
            analysis['schema_evolution_expected'] = True
        
        if 'relational' in description or 'sql' in tags:
            analysis['prefer_sql'] = True
        
        if 'nosql' in tags or 'flexible' in description:
            analysis['prefer_nosql'] = True
        
        # Extract optimization hints
        if 'optimize_by' in hints:
            analysis['optimization_fields'] = hints['optimize_by']
        
        if 'query_fields' in hints:
            analysis['query_fields'] = hints['query_fields']


# ============================================================================
# DATABASE DECISION ENGINE
# ============================================================================

class DatabaseDecisionEngine:
    """Decides whether to use SQL or NoSQL based on data characteristics"""
    
    @staticmethod
    def decide(analysis: Dict[str, Any]) -> Tuple[str, str, Dict[str, Any]]:
        """
        Decide between SQL and NoSQL storage
        
        Args:
            analysis: Schema analysis from SchemaAnalyzer
            
        Returns:
            Tuple of (decision, reason, recommendations)
        """
        score_sql = 0
        score_nosql = 0
        reasons = []
        
        # Factor 1: Structure consistency
        if analysis.get('is_uniform'):
            score_sql += 3
            reasons.append("Uniform structure favors SQL")
        else:
            score_nosql += 2
            reasons.append("Non-uniform structure favors NoSQL")
        
        # Factor 2: Tabular nature
        if analysis.get('is_tabular'):
            score_sql += 4
            reasons.append("Tabular data is ideal for SQL")
        
        # Factor 3: Nesting depth
        nesting_depth = analysis.get('nesting_depth', 0)
        if nesting_depth == 0:
            score_sql += 2
            reasons.append("Flat structure suits SQL")
        elif nesting_depth <= 2:
            score_sql += 1
            score_nosql += 1
            reasons.append("Shallow nesting works for both")
        else:
            score_nosql += 3
            reasons.append("Deep nesting favors NoSQL")
        
        # Factor 4: Relationships
        if analysis.get('relationship_candidates'):
            score_sql += 2
            reasons.append("Detected relationships favor SQL")
        
        # Factor 5: Arrays in objects
        if analysis.get('has_arrays_in_objects'):
            score_nosql += 2
            reasons.append("Arrays in objects complicate SQL, favor NoSQL")
        
        # Factor 6: Schema evolution expectation
        if analysis.get('schema_evolution_expected'):
            score_nosql += 3
            reasons.append("Expected schema changes favor NoSQL")
        
        # Factor 7: User preferences via metadata
        if analysis.get('prefer_sql'):
            score_sql += 5
            reasons.append("User preference for SQL")
        elif analysis.get('prefer_nosql'):
            score_nosql += 5
            reasons.append("User preference for NoSQL")
        
        # Factor 8: Data size (array length)
        array_length = analysis.get('array_length', 0)
        if array_length > 10000:
            # Very large datasets might benefit from NoSQL scalability
            score_nosql += 1
            reasons.append("Large dataset may benefit from NoSQL scalability")
        
        # Make decision
        decision = 'sql' if score_sql > score_nosql else 'nosql'
        
        recommendations = {
            'sql_score': score_sql,
            'nosql_score': score_nosql,
            'confidence': abs(score_sql - score_nosql),
            'reasons': reasons,
        }
        
        reason_summary = f"{decision.upper()} chosen (score: {score_sql} vs {score_nosql})"
        
        return decision, reason_summary, recommendations


# ============================================================================
# SCHEMA INFERENCE
# ============================================================================

class SchemaInferrer:
    """Infers detailed schema from structured data"""
    
    @staticmethod
    def infer_schema(data: Any, file_type: str, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Infer complete schema from data
        
        Args:
            data: Parsed data
            file_type: File type (json, csv, xml)
            analysis: Analysis from SchemaAnalyzer
            
        Returns:
            Detailed schema specification
        """
        schema = {
            'file_type': file_type,
            'version': '1.0',
            'created_at': datetime.utcnow().isoformat(),
        }
        
        if file_type == 'json':
            schema.update(SchemaInferrer._infer_json_schema(data, analysis))
        elif file_type == 'csv':
            schema.update(SchemaInferrer._infer_csv_schema(data))
        elif file_type == 'xml':
            schema.update(SchemaInferrer._infer_xml_schema(data))
        
        return schema
    
    @staticmethod
    def _infer_json_schema(data: Any, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Infer schema from JSON data"""
        schema = {
            'type': 'json',
            'structure': analysis.get('data_type'),
        }
        
        if isinstance(data, list) and data and isinstance(data[0], dict):
            # Array of objects - infer table-like schema
            schema['tables'] = SchemaInferrer._infer_tables_from_json_array(data, analysis)
        elif isinstance(data, dict):
            # Single object
            schema['fields'] = SchemaInferrer._infer_fields_from_object(data)
        
        return schema
    
    @staticmethod
    def _infer_tables_from_json_array(data: List[Dict], analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Infer table schemas from JSON array"""
        tables = []
        
        # Main table
        main_table = {
            'name': 'main_data',
            'type': 'primary',
            'fields': [],
            'indexes': [],
            'relationships': [],
        }
        
        all_keys = analysis.get('all_keys', [])
        key_types = analysis.get('key_types', {})
        required_fields = set(analysis.get('required_fields', []))
        nested_fields = set(analysis.get('nested_fields', []))
        
        # Infer fields for main table
        for key in all_keys:
            if key in nested_fields:
                # Nested field - will become a separate table or embedded document
                continue
            
            field_types = key_types.get(key, ['str'])
            primary_type = SchemaInferrer._resolve_primary_type(field_types)
            
            field_def = {
                'name': key,
                'type': primary_type,
                'required': key in required_fields,
                'nullable': key not in required_fields,
            }
            
            # Detect if this is a primary key
            if key == 'id' or key.endswith('_id'):
                field_def['is_primary_key'] = (key == 'id')
                field_def['is_foreign_key'] = (key != 'id')
                
                if field_def['is_foreign_key']:
                    # Potential relationship
                    ref_table = key.replace('_id', '')
                    main_table['relationships'].append({
                        'type': 'many_to_one',
                        'field': key,
                        'references_table': ref_table,
                        'references_field': 'id',
                    })
            
            main_table['fields'].append(field_def)
        
        # Add indexes for important fields
        main_table['indexes'] = SchemaInferrer._suggest_indexes(main_table['fields'], analysis)
        
        tables.append(main_table)
        
        # Handle nested fields - create related tables
        for nested_field in nested_fields:
            sample_values = [obj.get(nested_field) for obj in data[:10] if nested_field in obj]
            
            if sample_values and isinstance(sample_values[0], list):
                # Array field - create junction/related table
                related_table = SchemaInferrer._create_related_table_from_array(
                    nested_field, sample_values, main_table['name']
                )
                tables.append(related_table)
            elif sample_values and isinstance(sample_values[0], dict):
                # Nested object - create related table
                related_table = SchemaInferrer._create_related_table_from_object(
                    nested_field, sample_values, main_table['name']
                )
                tables.append(related_table)
        
        return tables
    
    @staticmethod
    def _infer_fields_from_object(obj: Dict) -> List[Dict[str, Any]]:
        """Infer field definitions from object"""
        fields = []
        
        for key, value in obj.items():
            field_def = {
                'name': key,
                'type': SchemaInferrer._python_type_to_sql_type(type(value).__name__),
                'required': True,  # Single object, assume all fields required
                'nullable': value is None,
            }
            fields.append(field_def)
        
        return fields
    
    @staticmethod
    def _create_related_table_from_array(field_name: str, sample_values: List[List], parent_table: str) -> Dict[str, Any]:
        """Create a related table definition from an array field"""
        table = {
            'name': f"{parent_table}_{field_name}",
            'type': 'junction',
            'fields': [
                {'name': 'id', 'type': 'integer', 'is_primary_key': True, 'auto_increment': True},
                {'name': f"{parent_table}_id", 'type': 'integer', 'is_foreign_key': True},
            ],
            'indexes': [],
            'relationships': [
                {
                    'type': 'many_to_one',
                    'field': f"{parent_table}_id",
                    'references_table': parent_table,
                    'references_field': 'id',
                }
            ],
        }
        
        # Analyze array elements
        if sample_values:
            first_elem = sample_values[0][0] if sample_values[0] else None
            
            if isinstance(first_elem, dict):
                # Array of objects
                for key, value in first_elem.items():
                    table['fields'].append({
                        'name': key,
                        'type': SchemaInferrer._python_type_to_sql_type(type(value).__name__),
                        'required': False,
                    })
            else:
                # Array of primitives
                table['fields'].append({
                    'name': 'value',
                    'type': SchemaInferrer._python_type_to_sql_type(type(first_elem).__name__),
                    'required': False,
                })
        
        return table
    
    @staticmethod
    def _create_related_table_from_object(field_name: str, sample_values: List[Dict], parent_table: str) -> Dict[str, Any]:
        """Create a related table definition from a nested object field"""
        table = {
            'name': field_name,
            'type': 'related',
            'fields': [
                {'name': 'id', 'type': 'integer', 'is_primary_key': True, 'auto_increment': True},
                {'name': f"{parent_table}_id", 'type': 'integer', 'is_foreign_key': True},
            ],
            'indexes': [],
            'relationships': [
                {
                    'type': 'many_to_one',
                    'field': f"{parent_table}_id",
                    'references_table': parent_table,
                    'references_field': 'id',
                }
            ],
        }
        
        # Infer fields from nested object
        if sample_values:
            all_keys = set()
            for obj in sample_values:
                if isinstance(obj, dict):
                    all_keys.update(obj.keys())
            
            for key in all_keys:
                sample_value = next((obj.get(key) for obj in sample_values if key in obj), None)
                table['fields'].append({
                    'name': key,
                    'type': SchemaInferrer._python_type_to_sql_type(type(sample_value).__name__),
                    'required': False,
                })
        
        return table
    
    @staticmethod
    def _suggest_indexes(fields: List[Dict[str, Any]], analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Suggest indexes based on field characteristics"""
        indexes = []
        
        # Always index primary keys and foreign keys
        for field in fields:
            if field.get('is_primary_key'):
                indexes.append({
                    'name': f"idx_pk_{field['name']}",
                    'fields': [field['name']],
                    'type': 'primary',
                    'unique': True,
                })
            elif field.get('is_foreign_key'):
                indexes.append({
                    'name': f"idx_fk_{field['name']}",
                    'fields': [field['name']],
                    'type': 'index',
                })
        
        # Index optimization fields from metadata
        optimization_fields = analysis.get('optimization_fields', [])
        for opt_field in optimization_fields:
            if any(f['name'] == opt_field for f in fields):
                indexes.append({
                    'name': f"idx_opt_{opt_field}",
                    'fields': [opt_field],
                    'type': 'index',
                })
        
        # Index common query fields
        common_index_fields = ['email', 'username', 'created_at', 'updated_at', 'timestamp', 'date']
        for field in fields:
            if field['name'] in common_index_fields and not any(idx for idx in indexes if field['name'] in idx['fields']):
                indexes.append({
                    'name': f"idx_{field['name']}",
                    'fields': [field['name']],
                    'type': 'index',
                })
        
        return indexes
    
    @staticmethod
    def _infer_csv_schema(data: Dict[str, Any]) -> Dict[str, Any]:
        """Infer schema from CSV data"""
        return {
            'type': 'csv',
            'tables': [{
                'name': 'csv_data',
                'type': 'primary',
                'fields': [
                    {
                        'name': col,
                        'type': 'text',  # CSV columns are typically text
                        'required': True,
                    }
                    for col in data.get('columns', [])
                ],
            }],
        }
    
    @staticmethod
    def _infer_xml_schema(data: Dict[str, Any]) -> Dict[str, Any]:
        """Infer schema from XML data"""
        return {
            'type': 'xml',
            'root_tag': data.get('root_tag', 'root'),
            'structure': 'hierarchical',
        }
    
    @staticmethod
    def _resolve_primary_type(types: List[str]) -> str:
        """Resolve primary type from multiple observed types"""
        if not types:
            return 'text'
        
        # If all same type, use that
        if len(set(types)) == 1:
            return SchemaInferrer._python_type_to_sql_type(types[0])
        
        # Mixed types - use most general
        if 'str' in types:
            return 'text'
        elif 'float' in types:
            return 'real'
        elif 'int' in types:
            return 'integer'
        else:
            return 'text'
    
    @staticmethod
    def _python_type_to_sql_type(python_type: str) -> str:
        """Convert Python type to SQL type"""
        type_mapping = {
            'str': 'text',
            'int': 'integer',
            'float': 'real',
            'bool': 'boolean',
            'NoneType': 'text',
            'dict': 'jsonb',
            'list': 'jsonb',
        }
        return type_mapping.get(python_type, 'text')
    
    @staticmethod
    def _python_type_to_nosql_type(python_type: str) -> str:
        """Convert Python type to MongoDB/NoSQL type"""
        type_mapping = {
            'str': 'string',
            'int': 'number',
            'float': 'number',
            'bool': 'boolean',
            'NoneType': 'null',
            'dict': 'object',
            'list': 'array',
        }
        return type_mapping.get(python_type, 'string')


# ============================================================================
# SQL SCHEMA GENERATOR
# ============================================================================

class SqlSchemaGenerator:
    """Generates SQL DDL statements from inferred schema"""
    
    @staticmethod
    def generate_sql_schema(schema: Dict[str, Any], table_prefix: str = '') -> Dict[str, Any]:
        """
        Generate SQL DDL statements
        
        Args:
            schema: Inferred schema
            table_prefix: Optional prefix for table names
            
        Returns:
            Dictionary with SQL statements and execution plan
        """
        sql_statements = []
        tables = schema.get('tables', [])
        
        # Generate CREATE TABLE statements
        for table in tables:
            create_stmt = SqlSchemaGenerator._generate_create_table(table, table_prefix)
            sql_statements.append({
                'type': 'create_table',
                'table': table['name'],
                'sql': create_stmt,
            })
        
        # Generate CREATE INDEX statements
        for table in tables:
            for index in table.get('indexes', []):
                if index.get('type') != 'primary':  # Primary key already in CREATE TABLE
                    index_stmt = SqlSchemaGenerator._generate_create_index(
                        index, table['name'], table_prefix
                    )
                    sql_statements.append({
                        'type': 'create_index',
                        'table': table['name'],
                        'index': index['name'],
                        'sql': index_stmt,
                    })
        
        # Generate foreign key constraints (if not inline)
        for table in tables:
            for relationship in table.get('relationships', []):
                if relationship.get('type') in ['many_to_one', 'one_to_one']:
                    fk_stmt = SqlSchemaGenerator._generate_foreign_key(
                        relationship, table['name'], table_prefix
                    )
                    if fk_stmt:
                        sql_statements.append({
                            'type': 'add_foreign_key',
                            'table': table['name'],
                            'sql': fk_stmt,
                        })
        
        return {
            'sql_statements': sql_statements,
            'execution_order': [stmt['sql'] for stmt in sql_statements],
            'table_count': len(tables),
        }
    
    @staticmethod
    def _generate_create_table(table: Dict[str, Any], table_prefix: str) -> str:
        """Generate CREATE TABLE statement"""
        table_name = f"{table_prefix}{table['name']}" if table_prefix else table['name']
        
        # Build field definitions
        field_defs = []
        primary_keys = []
        
        for field in table.get('fields', []):
            field_def = SqlSchemaGenerator._generate_field_definition(field)
            field_defs.append(field_def)
            
            if field.get('is_primary_key'):
                primary_keys.append(field['name'])
        
        # Add primary key constraint
        if primary_keys:
            field_defs.append(f"PRIMARY KEY ({', '.join(primary_keys)})")
        
        fields_sql = ',\n    '.join(field_defs)
        
        create_sql = f"""CREATE TABLE IF NOT EXISTS {table_name} (
    {fields_sql}
);"""
        
        return create_sql
    
    @staticmethod
    def _generate_field_definition(field: Dict[str, Any]) -> str:
        """Generate field definition for CREATE TABLE"""
        name = field['name']
        data_type = field['type'].upper()
        
        # Map SQL types to PostgreSQL types (Supabase uses PostgreSQL)
        type_mapping = {
            'INTEGER': 'INTEGER',
            'REAL': 'REAL',
            'TEXT': 'TEXT',
            'BOOLEAN': 'BOOLEAN',
            'JSONB': 'JSONB',
            'TIMESTAMP': 'TIMESTAMP',
            'DATE': 'DATE',
        }
        data_type = type_mapping.get(data_type, 'TEXT')
        
        definition = f"{name} {data_type}"
        
        # Add constraints
        if field.get('is_primary_key'):
            if field.get('auto_increment'):
                definition = f"{name} SERIAL"
        
        if field.get('required') and not field.get('is_primary_key'):
            definition += " NOT NULL"
        
        if field.get('unique'):
            definition += " UNIQUE"
        
        if field.get('default') is not None:
            definition += f" DEFAULT {field['default']}"
        
        return definition
    
    @staticmethod
    def _generate_create_index(index: Dict[str, Any], table_name: str, table_prefix: str) -> str:
        """Generate CREATE INDEX statement"""
        full_table_name = f"{table_prefix}{table_name}" if table_prefix else table_name
        index_name = f"{table_prefix}{index['name']}" if table_prefix else index['name']
        
        fields = ', '.join(index['fields'])
        unique = 'UNIQUE ' if index.get('unique') else ''
        
        return f"CREATE {unique}INDEX IF NOT EXISTS {index_name} ON {full_table_name} ({fields});"
    
    @staticmethod
    def _generate_foreign_key(relationship: Dict[str, Any], table_name: str, table_prefix: str) -> Optional[str]:
        """Generate ALTER TABLE ADD FOREIGN KEY statement"""
        full_table_name = f"{table_prefix}{table_name}" if table_prefix else table_name
        ref_table = f"{table_prefix}{relationship['references_table']}" if table_prefix else relationship['references_table']
        
        field = relationship['field']
        ref_field = relationship['references_field']
        
        constraint_name = f"fk_{table_name}_{field}"
        
        return f"""ALTER TABLE {full_table_name} 
ADD CONSTRAINT {constraint_name} 
FOREIGN KEY ({field}) REFERENCES {ref_table}({ref_field});"""


# ============================================================================
# NoSQL SCHEMA GENERATOR
# ============================================================================

class NoSqlSchemaGenerator:
    """Generates NoSQL schema and indexes for MongoDB"""
    
    @staticmethod
    def generate_nosql_schema(schema: Dict[str, Any], collection_name: str = 'structured_data') -> Dict[str, Any]:
        """
        Generate NoSQL schema definition and indexes
        
        Args:
            schema: Inferred schema
            collection_name: Name for MongoDB collection
            
        Returns:
            Dictionary with collection schema and index definitions
        """
        nosql_schema = {
            'collection_name': collection_name,
            'schema_version': schema.get('version', '1.0'),
            'document_structure': {},
            'indexes': [],
            'validation_rules': {},
        }
        
        # Build document structure
        if schema.get('type') == 'json':
            nosql_schema['document_structure'] = NoSqlSchemaGenerator._build_document_structure(schema)
        
        # Generate indexes
        nosql_schema['indexes'] = NoSqlSchemaGenerator._generate_indexes(schema)
        
        # Generate validation rules (MongoDB schema validation)
        nosql_schema['validation_rules'] = NoSqlSchemaGenerator._generate_validation_rules(schema)
        
        return nosql_schema
    
    @staticmethod
    def _build_document_structure(schema: Dict[str, Any]) -> Dict[str, Any]:
        """Build document structure definition"""
        structure = {
            'bsonType': 'object',
            'properties': {},
        }
        
        tables = schema.get('tables', [])
        if tables:
            main_table = tables[0]
            
            for field in main_table.get('fields', []):
                structure['properties'][field['name']] = {
                    'bsonType': NoSqlSchemaGenerator._sql_type_to_bson_type(field['type']),
                    'description': f"Field {field['name']}",
                }
        
        return structure
    
    @staticmethod
    def _generate_indexes(schema: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate index definitions for MongoDB
        
        NOTE: We intentionally avoid creating indexes on data fields because:
        1. Data fields might contain null values (causing duplicate key errors)
        2. Data structure varies between files (some fields may not exist)
        3. The `file_id` index already exists (created during DB initialization)
        4. Creating indexes on every field is unnecessary and causes conflicts
        
        MongoDB automatically indexes:
        - _id (primary key) - created automatically by MongoDB
        - file_id (created during database setup as 'file_id_1')
        
        For specific queries, users should create custom indexes manually
        based on their actual query patterns.
        """
        indexes = []
        
        # Don't create any indexes - MongoDB automatically handles _id
        # and file_id index already exists from database initialization
        
        return indexes
    
    @staticmethod
    def _generate_validation_rules(schema: Dict[str, Any]) -> Dict[str, Any]:
        """Generate MongoDB schema validation rules"""
        rules = {
            '$jsonSchema': {
                'bsonType': 'object',
                'required': ['file_id', 'data', 'created_at'],
                'properties': {
                    'file_id': {
                        'bsonType': 'string',
                        'description': 'Unique file identifier',
                    },
                    'data': {
                        'bsonType': ['object', 'array'],
                        'description': 'Structured data content',
                    },
                    'created_at': {
                        'bsonType': 'string',
                        'description': 'Creation timestamp',
                    },
                },
            },
        }
        
        return rules
    
    @staticmethod
    def _sql_type_to_bson_type(sql_type: str) -> str:
        """Convert SQL type to BSON type"""
        type_mapping = {
            'integer': 'int',
            'real': 'double',
            'text': 'string',
            'boolean': 'bool',
            'jsonb': 'object',
            'timestamp': 'date',
            'date': 'date',
        }
        return type_mapping.get(sql_type.lower(), 'string')


# ============================================================================
# SCHEMA MANIFEST MANAGER
# ============================================================================

class SchemaManifestManager:
    """Manages schema manifests with versioning"""
    
    def __init__(self, db_storage):
        self.db_storage = db_storage
    
    def save_manifest(self, file_id: str, schema: Dict[str, Any], 
                     storage_backend: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save schema manifest to database
        
        Args:
            file_id: File identifier
            schema: Complete schema definition
            storage_backend: 'sql' or 'nosql'
            metadata: Additional metadata
            
        Returns:
            Save result
        """
        manifest = {
            'file_id': file_id,
            'schema_version': schema.get('version', '1.0'),
            'storage_backend': storage_backend,
            'schema': schema,
            'metadata': metadata,
            'created_at': datetime.utcnow().isoformat(),
            'history': [],
        }
        
        try:
            # Store in MongoDB (use 'is not None' for proper collection check)
            if self.db_storage is not None and self.db_storage.collection is not None:
                result = self.db_storage.collection.update_one(
                    {'file_id': file_id},
                    {
                        '$set': {
                            'schema_manifest': manifest,
                            'updated_at': datetime.utcnow().isoformat(),
                        }
                    },
                    upsert=True
                )
                
                return {
                    'success': True,
                    'manifest_id': file_id,
                }
            
            return {
                'success': False,
                'error': 'Database not available',
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def get_manifest(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve schema manifest by file ID"""
        try:
            if self.db_storage is not None and self.db_storage.collection is not None:
                record = self.db_storage.collection.find_one({'file_id': file_id})
                if record:
                    return record.get('schema_manifest')
            return None
        except Exception as e:
            print(f"Error retrieving manifest: {e}")
            return None


# ============================================================================
# STRUCTURED DATA PROCESSOR (Main Pipeline)
# ============================================================================

class StructuredDataProcessor:
    """
    Main structured data processing pipeline with intelligent routing,
    schema inference, and automatic table/collection creation
    """
    
    def __init__(self):
        """Initialize structured data processor"""
        print("Initializing Enhanced Structured Data Processor...")
        
        # Initialize storage backends
        self.s3_storage = S3Storage()
        self.db_storage = get_db_storage()
        
        # Initialize components
        self.schema_analyzer = SchemaAnalyzer()
        self.decision_engine = DatabaseDecisionEngine()
        self.schema_inferrer = SchemaInferrer()
        self.sql_generator = SqlSchemaGenerator()
        self.nosql_generator = NoSqlSchemaGenerator()
        self.manifest_manager = SchemaManifestManager(self.db_storage)
        
        # Initialize Supabase client (for SQL storage)
        self._supabase_client = None
        
        print("Enhanced Structured Data Processor initialized!")
    
    def get_supabase_client(self) -> Optional[Client]:
        """Get Supabase client for SQL storage"""
        if self._supabase_client is None and SUPABASE_AVAILABLE:
            supabase_url = os.getenv("SUPABASE_URL")
            # Use service role key for admin operations (creating tables, etc.)
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
            
            if supabase_url and supabase_key:
                try:
                    self._supabase_client = create_client(supabase_url, supabase_key)
                    print("✓ Connected to Supabase SQL")
                except Exception as e:
                    print(f"⚠ Could not connect to Supabase SQL: {e}")
        
        return self._supabase_client
    
    def get_postgres_connection(self):
        """Get direct PostgreSQL connection for executing raw SQL"""
        if not PSYCOPG2_AVAILABLE:
            return None
        
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_password = os.getenv("SUPABASE_DB_PASSWORD") or os.getenv("POSTGRES_PASSWORD")
            
            if not supabase_url or not supabase_password:
                print("  ⚠ Missing SUPABASE_DB_PASSWORD - cannot execute raw SQL")
                return None
            
            # Parse Supabase URL to get project reference
            # Format: https://xxxxx.supabase.co
            project_ref = supabase_url.replace('https://', '').replace('http://', '').split('.')[0]
            
            # Supabase PostgreSQL connection uses pooler format
            # Format: db.{project-ref}.supabase.co (IPv4) or aws-0-{region}.pooler.supabase.com (pooler)
            # Try direct connection first
            host = f"{project_ref}.pooler.supabase.com"
            
            conn = psycopg2.connect(
                host=host,
                port=6543,  # Supabase pooler port (use 5432 for direct connection)
                database="postgres",
                user=f"postgres.{project_ref}",
                password=supabase_password,
                sslmode='require'
            )
            return conn
        except Exception as e:
            print(f"  ⚠ Could not connect to PostgreSQL: {e}")
            print(f"  ℹ️  Try running this SQL manually in Supabase SQL Editor")
            return None
    
    # ========================================================================
    # FILE PARSING
    # ========================================================================
    
    def parse_json(self, file_path: str) -> Any:
        """Parse and validate JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Validate JSON is not empty
            if data is None:
                raise ValueError("JSON file is empty")
            
            return data
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON format: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing JSON: {str(e)}")
    
    def parse_csv(self, file_path: str) -> Dict[str, Any]:
        """Parse CSV file into structured format"""
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
        """Parse XML file into structured format"""
        try:
            tree = ET.parse(file_path)
            root = tree.getroot()
            
            def element_to_dict(element):
                result = {
                    'tag': element.tag,
                    'attributes': element.attrib,
                }
                
                if element.text and element.text.strip():
                    result['text'] = element.text.strip()
                
                children = list(element)
                if children:
                    result['children'] = [element_to_dict(child) for child in children]
                
                return result
            
            return {
                'root': element_to_dict(root),
                'root_tag': root.tag,
            }
            
        except ET.ParseError as e:
            raise ValueError(f"Invalid XML format: {str(e)}")
        except Exception as e:
            raise Exception(f"Error parsing XML: {str(e)}")
    
    # ========================================================================
    # STORAGE OPERATIONS
    # ========================================================================
    
    def store_in_supabase_sql(self, file_id: str, data: Any, schema: Dict[str, Any],
                              sql_schema: Dict[str, Any], 
                              custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Store data in Supabase SQL with automatic table creation
        
        Args:
            file_id: File identifier
            data: Parsed data
            schema: Inferred schema
            sql_schema: Generated SQL schema
            custom_metadata: Custom metadata including user_id
            
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
        
            # Step 1: Ensure table exists using direct PostgreSQL connection
            print("  → Ensuring 'structured_data' table exists...")
            
            conn = self.get_postgres_connection()
            if conn:
                try:
                    cursor = conn.cursor()
                    
                    # Create table if not exists
                    create_table_sql = """
                    CREATE TABLE IF NOT EXISTS structured_data (
                        id SERIAL PRIMARY KEY,
                        file_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        row_index INTEGER,
                        data JSONB,
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                    """
                    cursor.execute(create_table_sql)
                    
                    # Create indexes if not exist
                    cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_structured_data_user_id 
                    ON structured_data(user_id);
                    """)
                    
                    cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_structured_data_file_id 
                    ON structured_data(file_id);
                    """)
                    
                    # Enable RLS (if not already enabled)
                    cursor.execute("""
                    ALTER TABLE structured_data ENABLE ROW LEVEL SECURITY;
                    """)
                    
                    # Create policy (drop if exists and recreate)
                    cursor.execute("""
                    DROP POLICY IF EXISTS "Users access own data" ON structured_data;
                    """)
                    
                    cursor.execute("""
                    CREATE POLICY "Users access own data" ON structured_data
                    FOR ALL USING (user_id = auth.uid()::text);
                    """)
                    
                    conn.commit()
                    cursor.close()
                    print("    ✓ Table 'structured_data' ready with indexes and RLS")
                    
                except Exception as e:
                    print(f"    ⚠ Error creating table: {e}")
                    if conn:
                        conn.rollback()
                finally:
                    if conn:
                        conn.close()
            else:
                print("    ℹ️  Could not connect to PostgreSQL directly")
                print("    ℹ️  Make sure SUPABASE_DB_PASSWORD is set in .env")
                print("    ℹ️  Attempting to insert anyway (table may already exist)...")
            
            # Step 2: Insert data into table
            print("  → Inserting data into 'structured_data' table...")
            
            rows_inserted = 0
            
            # Extract user_id from custom metadata
            user_id = custom_metadata.get('user_id') if custom_metadata else None
            if not user_id:
                print("    ⚠ Warning: No user_id provided, falling back to MongoDB")
                return {
                    'success': False,
                    'error': 'user_id is required for SQL storage',
                    'fallback_to_nosql': True,
                }
            
            try:
                if isinstance(data, list):
                    # Insert array of objects
                    batch_size = 100
                    for i in range(0, len(data), batch_size):
                        batch = data[i:i + batch_size]
                        
                        # Prepare records with file_id and user_id
                        records = []
                        for idx, item in enumerate(batch):
                            record = {
                                'file_id': file_id,
                                'user_id': user_id,
                                'row_index': i + idx,
                                'data': item if isinstance(item, dict) else {'value': item},
                                'created_at': datetime.utcnow().isoformat(),
                            }
                            records.append(record)
                        
                        try:
                            # Insert into 'structured_data' table
                            result = supabase.table('structured_data').insert(records).execute()
                            rows_inserted += len(records)
                            print(f"    ✓ Inserted batch: {len(records)} rows")
                        except Exception as e:
                            print(f"    ⚠ Error inserting batch: {e}")
                            print(f"    → Falling back to MongoDB storage...")
                            # Don't try individual inserts, just note the error
                            return {
                                'success': False,
                                'error': str(e),
                                'fallback_to_nosql': True,
                                'note': 'Supabase table may not exist. Create it manually or use NoSQL storage.'
                            }
                
                elif isinstance(data, dict):
                    # Insert single object
                    try:
                        record = {
                            'file_id': file_id,
                            'user_id': user_id,
                            'row_index': 0,
                            'data': data,
                            'created_at': datetime.utcnow().isoformat(),
                        }
                        supabase.table('structured_data').insert(record).execute()
                        rows_inserted = 1
                        print(f"    ✓ Inserted 1 row")
                    except Exception as e:
                        print(f"    ⚠ Error inserting record: {e}")
                        print(f"    → Falling back to MongoDB storage...")
                        return {
                            'success': False,
                            'error': str(e),
                            'fallback_to_nosql': True,
                            'note': 'Supabase table may not exist. Create it manually or use NoSQL storage.'
                        }
            except Exception as e:
                print(f"    ⚠ Unexpected error: {e}")
                return {
                    'success': False,
                    'error': str(e),
                    'fallback_to_nosql': True,
                }
            
            return {
                'success': True,
                'storage': 'supabase_sql',
                'rows_inserted': rows_inserted,
                'table': 'structured_data',
                'note': 'Data stored in Supabase SQL',
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'fallback_to_nosql': True,
            }
    
    def store_in_mongodb(self, file_id: str, data: Any, schema: Dict[str, Any],
                        nosql_schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store data in MongoDB with schema and indexes
        
        Args:
            file_id: File identifier
            data: Parsed data
            schema: Inferred schema
            nosql_schema: Generated NoSQL schema
            
        Returns:
            Storage result
        """
        try:
            if self.db_storage is None or self.db_storage.collection is None:
                return {
                    'success': False,
                    'error': 'MongoDB not available',
                }
            
            collection = self.db_storage.collection
            
            # Step 1: Create indexes
            print("  → Creating MongoDB indexes...")
            
            indexes_created = []
            for index_def in nosql_schema.get('indexes', []):
                try:
                    if index_def.get('note') != 'Automatic MongoDB index':
                        collection.create_index(
                            list(index_def['keys'].items()),
                            name=index_def['name'],
                            unique=index_def.get('unique', False)
                        )
                        indexes_created.append(index_def['name'])
                        print(f"    ✓ Created index: {index_def['name']}")
                except Exception as e:
                    print(f"    ⚠ Error creating index {index_def['name']}: {e}")
            
            # Step 2: Store data
            print("  → Storing data in MongoDB...")
            
            document = {
                'file_id': file_id,
                'data': data,
                'schema': nosql_schema,
                'created_at': datetime.utcnow().isoformat(),
            }
            
            collection.update_one(
                {'file_id': file_id},
                {'$set': document},
                upsert=True
            )
            
            return {
                'success': True,
                'storage': 'mongodb',
                'collection': nosql_schema.get('collection_name', 'structured_data'),
                'indexes_created': indexes_created,
                'document_count': 1,
                'note': 'Data stored in MongoDB',
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    # ========================================================================
    # VALIDATION & CONSISTENCY
    # ========================================================================
    
    def validate_data(self, data: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate data against inferred schema
        
        Args:
            data: Data to validate
            schema: Schema to validate against
            
        Returns:
            Validation result with errors if any
        """
        errors = []
        warnings = []
        
        try:
            if isinstance(data, list):
                # Validate array structure
                if not data:
                    warnings.append("Empty array")
                else:
                    # Check consistency across objects
                    if all(isinstance(item, dict) for item in data):
                        first_keys = set(data[0].keys())
                        
                        for idx, item in enumerate(data[1:], start=1):
                            item_keys = set(item.keys())
                            
                            # Check for missing keys
                            missing = first_keys - item_keys
                            if missing:
                                warnings.append(f"Row {idx}: missing keys {missing}")
                            
                            # Check for extra keys
                            extra = item_keys - first_keys
                            if extra:
                                warnings.append(f"Row {idx}: extra keys {extra}")
            
            elif isinstance(data, dict):
                # Validate object structure
                if not data:
                    warnings.append("Empty object")
            
            # Type consistency checks
            # (Add more validation rules as needed)
            
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
        }
    
    def compress_file(self, file_path: str, output_path: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
        """Compress file using gzip"""
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
    
    def extract_metadata(self, file_path: str, parsed_data: Any, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Extract comprehensive metadata"""
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
        
        # Add data statistics
        if isinstance(parsed_data, list):
            metadata['record_count'] = len(parsed_data)
        elif isinstance(parsed_data, dict):
            metadata['record_count'] = 1
            metadata['field_count'] = len(parsed_data)
        
        return metadata
    
    # ========================================================================
    # MAIN PROCESSING PIPELINE
    # ========================================================================
    
    def process_structured_data(self, file_path: str,
                               compress: bool = True,
                               custom_metadata: Optional[Dict[str, Any]] = None,
                               generate_embeddings: bool = True) -> Dict[str, Any]:
        """
        Process structured data through complete intelligent pipeline
        
        This is the main entry point that orchestrates:
        1. JSON detection and parsing
        2. Schema analysis and inference
        3. SQL vs NoSQL decision
        4. Automatic schema generation
        5. Table/collection creation
        6. Data insertion with indexes
        7. Manifest storage
        
        Args:
            file_path: Path to structured data file
            compress: Whether to compress the file
            custom_metadata: Additional metadata and hints
            
        Returns:
            Comprehensive processing result
        """
        try:
            file_path = str(Path(file_path).absolute())
            file_id = str(uuid.uuid4())
            file_ext = Path(file_path).suffix.lower()
            
            print(f"\n{'='*70}")
            print(f"🗂️  STRUCTURED DATA PIPELINE")
            print(f"File: {os.path.basename(file_path)}")
            print(f"File ID: {file_id}")
            print(f"{'='*70}\n")
            
            result = {
                'file_id': file_id,
                'original_file': file_path,
                'success': True,
            }
            
            # ================================================================
            # STEP 1: Parse structured data
            # ================================================================
            print("📋 Step 1: Parsing structured data...")
            
            parsed_data = None
            file_type = None
            
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
            
            print(f"   ✓ Parsed {file_type.upper()} successfully")
            
            # ================================================================
            # STEP 2: Analyze JSON structure
            # ================================================================
            print("\n🔍 Step 2: Analyzing data structure...")
            
            analysis = self.schema_analyzer.analyze_json_structure(parsed_data, custom_metadata)
            
            print(f"   • Data type: {analysis.get('data_type')}")
            print(f"   • Is tabular: {analysis.get('is_tabular')}")
            print(f"   • Is uniform: {analysis.get('is_uniform')}")
            print(f"   • Is nested: {analysis.get('is_nested')}")
            print(f"   • Nesting depth: {analysis.get('nesting_depth')}")
            
            result['analysis'] = analysis
            
            # ================================================================
            # STEP 3: SQL vs NoSQL decision
            # ================================================================
            print("\n🎯 Step 3: Database selection decision...")
            
            storage_backend, reason, recommendations = self.decision_engine.decide(analysis)
            
            print(f"   → Decision: {storage_backend.upper()}")
            print(f"   → Reason: {reason}")
            print(f"   → SQL score: {recommendations['sql_score']}, NoSQL score: {recommendations['nosql_score']}")
            print(f"   → Confidence: {recommendations['confidence']}")
            
            result['storage_backend'] = storage_backend
            result['decision_reason'] = reason
            result['decision_recommendations'] = recommendations
            
            # ================================================================
            # STEP 4: Infer schema
            # ================================================================
            print("\n📐 Step 4: Inferring schema...")
            
            schema = self.schema_inferrer.infer_schema(parsed_data, file_type, analysis)
            
            if schema.get('tables'):
                print(f"   ✓ Inferred {len(schema['tables'])} table(s)")
                for table in schema['tables']:
                    print(f"      → Table: {table['name']} ({len(table.get('fields', []))} fields)")
            
            result['schema'] = schema
            
            # ================================================================
            # STEP 5: Validate data
            # ================================================================
            print("\n✅ Step 5: Validating data consistency...")
            
            validation_result = self.validate_data(parsed_data, schema)
            
            if validation_result['valid']:
                print("   ✓ Data is valid")
            else:
                print(f"   ⚠ Validation errors: {len(validation_result['errors'])}")
                for error in validation_result['errors'][:5]:
                    print(f"      • {error}")
            
            if validation_result['warnings']:
                print(f"   ⚠ Validation warnings: {len(validation_result['warnings'])}")
            
            result['validation'] = validation_result
            
            # ================================================================
            # STEP 6: Generate storage schema
            # ================================================================
            print(f"\n🏗️  Step 6: Generating {storage_backend.upper()} schema...")
            
            if storage_backend == 'sql':
                sql_schema = self.sql_generator.generate_sql_schema(schema)
                print(f"   ✓ Generated {sql_schema['table_count']} table(s)")
                print(f"   ✓ Generated {len(sql_schema['sql_statements'])} SQL statement(s)")
                result['sql_schema'] = sql_schema
            else:
                nosql_schema = self.nosql_generator.generate_nosql_schema(schema)
                print(f"   ✓ Generated NoSQL schema for collection: {nosql_schema['collection_name']}")
                print(f"   ✓ Generated {len(nosql_schema['indexes'])} index(es)")
                result['nosql_schema'] = nosql_schema
            
            # ================================================================
            # STEP 7: Skip compression for structured data (keep as JSON)
            # ================================================================
            print("\n📦 Step 7: Skipping compression (structured data kept as JSON)")
            compressed_path = None
            compression_stats = None
            result['compression_stats'] = {
                'skipped': True,
                'reason': 'Structured data stored uncompressed for direct access'
            }
            
            # ================================================================
            # STEP 7.5: Generate embeddings for semantic search
            # ================================================================
            embedding_info = None
            if generate_embeddings:
                print("\n🔍 Step 7.5: Generating embeddings for semantic search...")
                try:
                    # Import unified service
                    from embedding_service import get_embedding_service
                    from storage_pinecone import PineconeStorage
                    
                    unified_service = get_embedding_service()
                    pinecone_storage = PineconeStorage()
                    
                    # Generate embedding for structured data
                    embedding_result = unified_service.generate_embedding(file_path, 'structured')
                    
                    if embedding_result and embedding_result.get('embedding') is not None:
                        embedding = embedding_result['embedding']
                        
                        # Store in Pinecone
                        pinecone_metadata = {
                            'file_id': file_id,
                            'type': 'structured',
                            'format': file_ext.replace('.', ''),
                            'original_name': os.path.basename(file_path),
                            'model': embedding_result.get('model', 'SentenceTransformer'),
                            'storage_backend': storage_backend,
                        }
                        
                        pinecone_result = pinecone_storage.upsert_embedding(
                            file_id=file_id,
                            embedding=embedding,
                            metadata=pinecone_metadata
                        )
                        
                        if pinecone_result.get('success'):
                            embedding_info = {
                                'dimension': len(embedding),
                                'original_dimension': embedding_result.get('original_dimension'),
                                'model': embedding_result.get('model'),
                                'stored_in_pinecone': True,
                            }
                            result['embedding_info'] = embedding_info
                            print(f"   ✓ Embedding generated and stored ({len(embedding)} dimensions)")
                        else:
                            print(f"   ⚠ Pinecone storage failed: {pinecone_result.get('error')}")
                            result['embedding_error'] = pinecone_result.get('error')
                    else:
                        print("   ⚠ Embedding generation returned None")
                        
                except Exception as e:
                    print(f"   ⚠ Embedding generation failed: {e}")
                    result['embedding_error'] = str(e)
            else:
                print("\n🔍 Step 7.5: Skipping embeddings (not requested)")
            
            # ================================================================
            # STEP 8: Upload to S3 (organized by user_id)
            # ================================================================
            print("\n☁️  Step 8: Uploading to S3...")
            
            upload_path = file_path  # Always use original file (no compression)
            
            # Extract user_id for folder organization
            user_id = custom_metadata.get('user_id') if custom_metadata else 'unknown'
            
            # Organize files by user: structured_data/{user_id}/{file_id}.json
            s3_key = f"structured_data/{user_id}/{file_id}{file_ext}"
            
            print(f"   → Organizing by user: {user_id}")
            
            s3_info = self.s3_storage.upload_file(
                upload_path,
                s3_key=s3_key,
                metadata={
                    'file_id': file_id,
                    'user_id': user_id,
                    'original_name': os.path.basename(file_path),
                    'type': 'structured_data',
                    'storage_backend': storage_backend,
                }
            )
            
            if s3_info.get('success'):
                result['s3_info'] = s3_info
                print(f"   ✓ Uploaded to S3: {s3_key}")
            else:
                print(f"   ⚠ S3 upload failed: {s3_info.get('error')}")
                result['s3_error'] = s3_info.get('error')
            
            # ================================================================
            # STEP 9: Store data in chosen database
            # ================================================================
            print(f"\n💾 Step 9: Storing data in {storage_backend.upper()}...")
            
            data_storage_result = None
            
            if storage_backend == 'sql':
                # Store in Supabase SQL
                data_storage_result = self.store_in_supabase_sql(
                    file_id, parsed_data, schema, result.get('sql_schema', {}),
                    custom_metadata  # Pass user_id and other metadata
                )
                
                if data_storage_result.get('fallback_to_nosql'):
                    print("   ⚠ SQL storage not available, falling back to MongoDB")
                    storage_backend = 'nosql'
                    nosql_schema = self.nosql_generator.generate_nosql_schema(schema)
                    result['nosql_schema'] = nosql_schema
                    data_storage_result = self.store_in_mongodb(
                        file_id, parsed_data, schema, nosql_schema
                    )
                elif data_storage_result.get('success'):
                    print(f"   ✓ Data stored in Supabase SQL")
                    print(f"   ✓ Inserted {data_storage_result.get('rows_inserted', 0)} row(s)")
            
            if storage_backend == 'nosql':
                # Store in MongoDB
                data_storage_result = self.store_in_mongodb(
                    file_id, parsed_data, schema, result.get('nosql_schema', {})
                )
                
                if data_storage_result.get('success'):
                    print(f"   ✓ Data stored in MongoDB")
            
            result['data_storage'] = data_storage_result
            result['storage_backend'] = storage_backend  # Update if fell back to NoSQL
            
            # ================================================================
            # STEP 10: Extract and store metadata
            # ================================================================
            print("\n📝 Step 10: Storing metadata...")
            
            metadata = self.extract_metadata(file_path, parsed_data, schema)
            
            if custom_metadata:
                metadata['custom'] = custom_metadata
            
            result['metadata'] = metadata
            
            # Store in MongoDB
            db_result = self.db_storage.insert_media(
                file_id=file_id,
                metadata=metadata,
                s3_info=s3_info or {},
                embedding_info={'storage_backend': storage_backend}
            )
            
            if db_result.get('success'):
                result['db_info'] = db_result
                if db_result.get('updated'):
                    print(f"   ✓ Metadata updated in MongoDB (file already existed)")
                else:
                    print(f"   ✓ Metadata stored in MongoDB (new file)")
            else:
                print(f"   ⚠ Metadata storage failed: {db_result.get('error')}")
                result['db_error'] = db_result.get('error')
            
            # ================================================================
            # STEP 11: Save schema manifest
            # ================================================================
            print("\n📚 Step 11: Saving schema manifest...")
            
            manifest_result = self.manifest_manager.save_manifest(
                file_id, schema, storage_backend, metadata
            )
            
            if manifest_result.get('success'):
                print(f"   ✓ Schema manifest saved")
                result['manifest'] = manifest_result
            else:
                print(f"   ⚠ Manifest save failed: {manifest_result.get('error')}")
            
            # ================================================================
            # COMPLETION
            # ================================================================
            print(f"\n{'='*70}")
            print(f"✅ STRUCTURED DATA PROCESSING COMPLETE")
            print(f"File ID: {file_id}")
            print(f"Storage Backend: {storage_backend.upper()}")
            print(f"{'='*70}\n")
            
            return result
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            
            return {
                'success': False,
                'error': f"Structured data processing failed: {str(e)}",
                'file_path': file_path,
            }


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Initialize processor
        processor = StructuredDataProcessor()
        
        # Process file
        result = processor.process_structured_data(file_path)
        
        # Print summary
        print("\n" + "="*70)
        print("PROCESSING SUMMARY")
        print("="*70)
        
        if result.get('success'):
            print(f"✓ Success!")
            print(f"File ID: {result['file_id']}")
            print(f"Storage Backend: {result.get('storage_backend', 'N/A').upper()}")
            
            if 'compression_stats' in result:
                print(f"Compression: {result['compression_stats']['compression_ratio']}")
            
            if 'data_storage' in result:
                storage = result['data_storage']
                if storage.get('storage') == 'supabase_sql':
                    print(f"SQL Rows Inserted: {storage.get('rows_inserted', 0)}")
                elif storage.get('storage') == 'mongodb':
                    print(f"MongoDB Documents: {storage.get('document_count', 0)}")
        else:
            print(f"❌ Failed: {result.get('error')}")
        
        print("="*70)
    else:
        print("Usage: python structured_data_pipeline.py <file_path>")
        print("\nExample: python structured_data_pipeline.py /path/to/data.json")
        print("\nSupported formats: JSON, CSV, XML")
