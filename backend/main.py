from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.router import connection

app = FastAPI(
    title="Database Management Tool", 
    description="API for managing database operations",
    version="1.0.0",
)

origins = [
    "http://localhost:8080", # Your frontend dev server
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows specific origins
    allow_credentials=True,
    allow_methods=["*"],    # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],    # Allows all headers
)

app.include_router(connection.router)


@app.get("/")
async def root():
    return {"message": "Welcome to the Database API!"}