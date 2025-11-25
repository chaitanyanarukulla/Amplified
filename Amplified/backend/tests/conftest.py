import pytest
import os
import sys
from httpx import AsyncClient, ASGITransport
from typing import AsyncGenerator, Generator
from sqlmodel import Session, select

# Add the backend directory to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from app.models import User
from app.database import engine
from app.services import auth_service
import uuid

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

@pytest.fixture(scope="function")
async def test_user() -> User:
    """
    Create a test user for authentication tests.
    """
    # Clean up any existing test user
    with Session(engine) as session:
        statement = select(User).where(User.email == "test@example.com")
        existing_user = session.exec(statement).first()
        if existing_user:
            session.delete(existing_user)
            session.commit()
    
    # Create new test user
    with Session(engine) as session:
        user = User(
            id=str(uuid.uuid4()),
            email="test@example.com",
            name="Test User",
            password_hash=auth_service.get_password_hash("testpassword123")
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        user_id = user.id
    
    # Yield the user
    with Session(engine) as session:
        statement = select(User).where(User.id == user_id)
        user = session.exec(statement).first()
        yield user
    
    # Cleanup after test
    with Session(engine) as session:
        statement = select(User).where(User.id == user_id)
        user_to_delete = session.exec(statement).first()
        if user_to_delete:
            session.delete(user_to_delete)
            session.commit()

@pytest.fixture(scope="function")
async def auth_token(test_user: User) -> str:
    """
    Generate an authentication token for the test user.
    """
    token = auth_service.create_access_token(data={"sub": test_user.id})
    return token

@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture that creates an async HTTP client for the FastAPI app (unauthenticated).
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture(scope="function")
async def auth_client(auth_token: str) -> AsyncGenerator[AsyncClient, None]:
    """
    Fixture that creates an authenticated async HTTP client for the FastAPI app.
    """
    transport = ASGITransport(app=app)
    headers = {"Authorization": f"Bearer {auth_token}"}
    async with AsyncClient(transport=transport, base_url="http://test", headers=headers) as ac:
        yield ac

@pytest.fixture(scope="function")
def temp_file() -> Generator[str, None, None]:
    """
    Creates a temporary file for upload tests and cleans it up afterwards.
    """
    filename = "test_upload_fixture.txt"
    with open(filename, "w") as f:
        f.write("This is a dummy file content for testing. " * 10)
    
    yield filename
    
    if os.path.exists(filename):
        os.remove(filename)

@pytest.fixture(scope="function")
def temp_audio_file() -> Generator[str, None, None]:
    """
    Creates a temporary dummy audio file.
    """
    filename = "test_audio_fixture.wav"
    # Create a minimal valid WAV header or just dummy bytes if the backend doesn't validate strictly
    with open(filename, "wb") as f:
        f.write(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")
    
    yield filename
    
    if os.path.exists(filename):
        os.remove(filename)
