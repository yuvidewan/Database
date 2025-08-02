from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.router import connection, edit, create
import os

app = FastAPI(
    title="Database Management Tool", 
    description="API for managing database operations",
    version="1.0.0",
)

# --- No longer needed for the packaged app, but harmless to keep ---
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Routers ---
app.include_router(connection.router)
app.include_router(edit.router)
app.include_router(create.router)

# --- NEW: Serve the Frontend ---
# This tells FastAPI to serve all files from the 'frontend' directory
# when a path doesn't match an API route.
# The path is relative to where you run the final executable.
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
async def read_root():
    # This serves the login.html page as the default entry point.
    return FileResponse(os.path.join("frontend", "login.html"))

# This catch-all route ensures that navigating to other HTML pages works correctly.
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join("frontend", full_path)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join("frontend", "login.html"))
