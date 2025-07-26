DB-Ease: A Simple Database Management Tool
This project is a lightweight, web-based tool for connecting to and interacting with a MySQL database. It consists of a Python FastAPI backend and a vanilla HTML, CSS, and JavaScript frontend.

Project Structure
db_mgmt/
├── backend/
│   ├── router/
│   │   └── connection.py   # FastAPI router for handling connections
│   └── main.py             # Main FastAPI application file
├── frontend/
│   ├── index.html          # Main data table view
│   ├── login.html          # Login page to enter DB credentials
│   ├── login.js            # JS for handling login logic
│   ├── script.js           # JS for the draggable/resizable table
│   └── style.css           # Shared styles for the frontend
└── .gitignore              # To exclude files from Git tracking

How to Use
To get the application running, you need to start the backend server and then open the frontend in your browser.

Prerequisites
Python 3.7+

A running MySQL database instance.

A Python virtual environment (recommended).

1. Backend Setup
First, navigate into the backend directory and set up the environment.

# Navigate to the backend directory
cd backend

# Create and activate a virtual environment (optional but recommended)
python -m venv env1
source env1/bin/activate  # On Windows, use `env1\Scripts\activate`

# Install the required Python packages
`pip install -r requirements.txt`

Once the dependencies are installed, you can run the backend server.

# From the backend/ directory, run the FastAPI server
uvicorn main:app --reload --port 8000

The backend server will now be running at http://localhost:8000.

2. Frontend Setup
The frontend is composed of static files and does not require a build step. You can serve them using your code editor's live server or Python's built-in HTTP server.

Option A: Using VS Code Live Server

Open the db_mgmt project folder in VS Code.

Navigate to the frontend directory.

Right-click on login.html and choose "Open with Live Server". This will likely open the page at http://127.0.0.1:5500.

Option B: Using Python's HTTP Server

Open a new terminal window.

Navigate into the frontend directory:

cd frontend

Start the Python web server on a different port (e.g., 8080) to avoid conflicts with the backend:

python -m http.server 8080

Open your browser and go to http://localhost:8080/login.html.

Note: Ensure the port you use for the frontend is added to the origins list in your backend's main.py CORS settings.

3. Connecting to the Database
With the backend running and the frontend open in your browser, you will see the login page.

Enter the username and password for your MySQL database.

Click the "Connect" button.

The frontend will send the credentials to the backend. If they are correct, you will be redirected to index.html, which displays the draggable and resizable data table. If the credentials are wrong, an error message will appear on the login page.