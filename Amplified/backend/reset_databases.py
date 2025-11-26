"""
Database Reset Script for UAT Testing

WARNING: This script will DELETE ALL DATA from both PostgreSQL and ChromaDB.
Only run this in development/testing environments!

Usage:
    python reset_databases.py
"""

import os
import shutil
from pathlib import Path
import structlog
from sqlmodel import Session, text

from app.database import engine
from app.core.logging import setup_logging

logger = structlog.get_logger(__name__)


def reset_chromadb():
    """Delete all ChromaDB data"""
    chroma_path = Path("./amplified_vectors")
    
    if chroma_path.exists():
        logger.info(f"Deleting ChromaDB data at {chroma_path}")
        shutil.rmtree(chroma_path)
        logger.info("✅ ChromaDB data deleted")
    else:
        logger.info("ChromaDB directory not found, skipping")


def reset_postgresql():
    """Delete all data from PostgreSQL tables"""
    logger.info("Resetting PostgreSQL database...")
    
    with Session(engine) as session:
        try:
            # Disable foreign key checks temporarily
            session.exec(text("SET session_replication_role = 'replica';"))
            
            # List of tables to truncate (in order to handle foreign keys)
            tables = [
                "meeting_actions",
                "meeting_summaries",
                "meetings",
                "documents",
                "test_case_generations",
                "analyzed_documents",
                "document_analyses",
                "voice_profiles",
                "jira_settings",
                "user_llm_preferences",
                "users"
            ]
            
            for table in tables:
                try:
                    logger.info(f"Truncating table: {table}")
                    session.exec(text(f"TRUNCATE TABLE {table} CASCADE;"))
                except Exception as e:
                    logger.warning(f"Could not truncate {table}: {e}")
            
            # Re-enable foreign key checks
            session.exec(text("SET session_replication_role = 'origin';"))
            
            session.commit()
            logger.info("✅ PostgreSQL data deleted")
            
        except Exception as e:
            session.rollback()
            logger.error(f"Failed to reset PostgreSQL: {e}")
            raise


def main():
    """Main reset function"""
    setup_logging()
    
    print("\n" + "="*60)
    print("⚠️  DATABASE RESET FOR UAT TESTING")
    print("="*60)
    print("\nThis will DELETE ALL DATA from:")
    print("  1. PostgreSQL (all tables)")
    print("  2. ChromaDB (all vectors)")
    print("\n⚠️  THIS CANNOT BE UNDONE!")
    print("="*60)
    
    # Safety confirmation
    confirmation = input("\nType 'DELETE ALL DATA' to confirm: ")
    
    if confirmation != "DELETE ALL DATA":
        print("\n❌ Reset cancelled. No data was deleted.")
        return
    
    print("\n🔄 Starting database reset...\n")
    
    try:
        # Reset ChromaDB first (safer, can rebuild from PostgreSQL)
        reset_chromadb()
        
        # Reset PostgreSQL
        reset_postgresql()
        
        print("\n" + "="*60)
        print("✅ DATABASE RESET COMPLETE")
        print("="*60)
        print("\nBoth databases are now empty and ready for UAT testing.")
        print("\nNext steps:")
        print("  1. Start the backend: uvicorn main:app --reload")
        print("  2. Create a new user account")
        print("  3. Begin UAT testing")
        print("\n")
        
    except Exception as e:
        print(f"\n❌ Error during reset: {e}")
        print("Please check the logs and try again.")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
