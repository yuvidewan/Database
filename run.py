import uvicorn
import webbrowser
import os
import multiprocessing
import time
import sys

def run_server():
    """
    This function runs the Uvicorn server.
    It will be executed in a separate process.
    """
    # Get the directory of the current script
    # This is important for PyInstaller to find the correct paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Change the working directory to the script's directory
    os.chdir(current_dir)
    
    is_frozen = getattr(sys, 'frozen', False)

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
        log_level="info",
        log_config=None if is_frozen else "uvicorn.config.LOGGING_CONFIG"
    )
def open_browser():
    """
    Opens the default web browser to the application's URL.
    """
    # Give the server a moment to start up before opening the browser
    time.sleep(2)
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    # PyInstaller needs this freeze_support() call for multiprocessing
    multiprocessing.freeze_support()

    # Create a process for the server
    server_process = multiprocessing.Process(target=run_server)
    
    # Start the server process
    server_process.start()
    
    # Open the browser in the main process
    open_browser()
    
    # Wait for the server process to finish (e.g., if the user closes the window)
    server_process.join()
