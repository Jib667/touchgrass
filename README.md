# TouchGrass

TouchGrass is an application that allows users to select a region in Google Maps like a polygon and get AI suggestions for an itinerary formed around that drawn-out area.

## Project Structure

- `frontend/`: React frontend built with Vite
- `backend/`: Python Flask backend

## Prerequisites

- Node.js (v14 or later)
- Python (v3.8 or later)
- pip
- npm

## Setup

### Clone the repository

```bash
git clone <repository-url>
cd touchgrass
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Running the Application

### Option 1: Run Frontend and Backend Separately

**Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will be available at http://localhost:5173

**Backend:**
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```
The backend API will be available at http://localhost:8000

### Option 2: Run Both with One Command (requires concurrently)

```bash
# Install the root dependencies first
npm install
# Then run both services
npm run dev
```

## API Endpoints

- `GET /api/health`: Health check endpoint

## Future Features

- Integration with Google Maps API
- Drawing polygons on the map
- AI-generated itinerary suggestions
- User authentication
- Saving favorite locations