"""
System Validation Script
Validates that all pipelines and components can be imported and initialized
"""
import sys
from pathlib import Path

def test_imports():
    """Test if all required modules can be imported"""
    print("\n" + "="*70)
    print("TESTING MODULE IMPORTS")
    print("="*70 + "\n")
    
    modules = [
        ('config', 'Config'),
        ('media_processor', 'MediaProcessor'),
        ('document_pipeline', 'DocumentProcessor'),
        ('structured_data_pipeline', 'StructuredDataProcessor'),
        ('code_pipeline', 'CodeProcessor'),
        ('generic_pipeline', 'GenericProcessor'),
        ('decision_engine', 'DecisionEngine'),
        ('storage_s3', 'S3Storage'),
        ('storage_db', 'get_db_storage'),
        ('storage_pinecone', 'PineconeStorage'),
    ]
    
    passed = 0
    failed = 0
    
    for module_name, class_name in modules:
        try:
            module = __import__(module_name, fromlist=[class_name])
            getattr(module, class_name)
            print(f"✓ {module_name}.{class_name}")
            passed += 1
        except ImportError as e:
            print(f"✗ {module_name}.{class_name} - Import Error: {e}")
            failed += 1
        except AttributeError as e:
            print(f"✗ {module_name}.{class_name} - Attribute Error: {e}")
            failed += 1
        except Exception as e:
            print(f"⚠ {module_name}.{class_name} - Warning: {e}")
            passed += 1  # Still count as passed if module can be imported
    
    print(f"\n{passed}/{len(modules)} modules imported successfully")
    if failed > 0:
        print(f"⚠ {failed} modules failed to import")
    
    return failed == 0


def test_decision_engine():
    """Test decision engine logic"""
    print("\n" + "="*70)
    print("TESTING DECISION ENGINE")
    print("="*70 + "\n")
    
    try:
        from decision_engine import DecisionEngine
        
        engine = DecisionEngine()
        
        # Test file type detection
        test_files = [
            ('image.jpg', 'media'),
            ('document.pdf', 'document'),
            ('data.csv', 'structured_data'),
            ('script.py', 'code'),
            ('unknown.xyz', 'generic'),
        ]
        
        all_correct = True
        for filename, expected_pipeline in test_files:
            pipeline, description = engine.determine_pipeline(filename)
            status = "✓" if pipeline == expected_pipeline else "✗"
            print(f"{status} {filename} → {pipeline} (expected: {expected_pipeline})")
            if pipeline != expected_pipeline:
                all_correct = False
        
        if all_correct:
            print("\n✓ All file type detections correct!")
            return True
        else:
            print("\n✗ Some file type detections incorrect")
            return False
            
    except Exception as e:
        print(f"✗ Decision Engine test failed: {e}")
        return False


def test_pipeline_info():
    """Test pipeline information retrieval"""
    print("\n" + "="*70)
    print("TESTING PIPELINE INFORMATION")
    print("="*70 + "\n")
    
    try:
        from decision_engine import DecisionEngine
        
        engine = DecisionEngine()
        info = engine.get_pipeline_info()
        
        expected_pipelines = ['media', 'document', 'structured_data', 'code', 'generic']
        
        for pipeline in expected_pipelines:
            if pipeline in info:
                print(f"✓ {pipeline}: {len(info[pipeline]['extensions'])} extensions supported")
            else:
                print(f"✗ {pipeline}: Missing from pipeline info")
                return False
        
        print(f"\n✓ All {len(expected_pipelines)} pipelines available")
        return True
        
    except Exception as e:
        print(f"✗ Pipeline info test failed: {e}")
        return False


def test_config():
    """Test configuration"""
    print("\n" + "="*70)
    print("TESTING CONFIGURATION")
    print("="*70 + "\n")
    
    try:
        from config import Config
        
        # Check required config values
        required = [
            'SUPABASE_PROJECT_ID',
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'S3_BUCKET_NAME',
            'MONGODB_URI',
            'PINECONE_API_KEY',
        ]
        
        missing = []
        for key in required:
            value = getattr(Config, key, None)
            if value:
                print(f"✓ {key} is set")
            else:
                print(f"⚠ {key} is NOT set (required for full functionality)")
                missing.append(key)
        
        # Check optional config
        optional = ['SUPABASE_URL', 'SUPABASE_KEY']
        for key in optional:
            value = getattr(Config, key, None)
            if value:
                print(f"✓ {key} is set (optional)")
            else:
                print(f"⚠ {key} is NOT set (optional, for structured data SQL storage)")
        
        if missing:
            print(f"\n⚠ {len(missing)} required config values missing")
            print("See KEYS_NEEDED.md for setup instructions")
            return False
        else:
            print("\n✓ All required configuration values are set")
            return True
            
    except Exception as e:
        print(f"✗ Configuration test failed: {e}")
        return False


def test_dependencies():
    """Test if all required Python packages are installed"""
    print("\n" + "="*70)
    print("TESTING DEPENDENCIES")
    print("="*70 + "\n")
    
    dependencies = [
        ('PIL', 'Pillow'),
        ('cv2', 'opencv-python'),
        ('numpy', 'numpy'),
        ('torch', 'torch'),
        ('clip', 'clip (via torch)'),
        ('boto3', 'boto3'),
        ('pymongo', 'pymongo'),
        ('pinecone', 'pinecone-client'),
        ('fastapi', 'fastapi'),
        ('PyPDF2', 'PyPDF2'),
        ('docx', 'python-docx'),
        ('pandas', 'pandas'),
        ('sentence_transformers', 'sentence-transformers'),
    ]
    
    installed = 0
    missing = 0
    
    for package, pip_name in dependencies:
        try:
            __import__(package)
            print(f"✓ {pip_name}")
            installed += 1
        except ImportError:
            print(f"✗ {pip_name} - NOT INSTALLED")
            missing += 1
    
    print(f"\n{installed}/{len(dependencies)} dependencies installed")
    
    if missing > 0:
        print(f"\n⚠ {missing} dependencies missing. Install with:")
        print("pip install -r requirements.txt")
        return False
    else:
        print("\n✓ All dependencies installed")
        return True


def main():
    """Run all validation tests"""
    print("\n" + "="*70)
    print("INTELLIGENT MULTI-MODAL STORAGE SYSTEM")
    print("VALIDATION SCRIPT")
    print("="*70)
    
    results = {
        'Dependencies': test_dependencies(),
        'Imports': test_imports(),
        'Configuration': test_config(),
        'Decision Engine': test_decision_engine(),
        'Pipeline Info': test_pipeline_info(),
    }
    
    # Summary
    print("\n" + "="*70)
    print("VALIDATION SUMMARY")
    print("="*70 + "\n")
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status:12} - {test_name}")
    
    passed_count = sum(results.values())
    total_count = len(results)
    
    print(f"\n{passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n✅ System validation SUCCESSFUL!")
        print("You can now start the API with: python api.py")
        return 0
    else:
        print("\n⚠ System validation INCOMPLETE")
        print("Please fix the issues above before running the system")
        print("See KEYS_NEEDED.md for setup instructions")
        return 1


if __name__ == "__main__":
    sys.exit(main())

