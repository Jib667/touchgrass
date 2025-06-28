# TouchGrass

An interactive web application that helps users explore the world by selecting regions on Google Maps to get AI-suggested itineraries based on geo-location.

*Note: THIS APPLICATION IS NOT YET PUBLISHED, WITH PLANS TO BE PUBLISHED WHEN FUNDS CAN BE SECURED FOR API COSTS. TO USE LOCALLY, FOLLOW THE BELLOW STEPS AND SET UP A FIREBASE, GOOGLE PLACES, AND GOOGLE GEMINI API.

## Project Structure

- `frontend/`: React/Vite frontend application
- `backend/`: Python/Flask backend application

## Firebase Setup

### Prerequisites

1. Install Firebase CLI:
```
npm install -g firebase-tools
```

2. Login to Firebase:
```
firebase login
```

### Frontend Deployment

1. Navigate to the frontend directory:
```
cd frontend
```

2. Build and deploy:
```
npm run firebase:deploy
```

### Backend Deployment (Cloud Functions)

1. Navigate to the backend directory:
```
cd backend
```

2. Deploy the Cloud Function:
```
firebase deploy --only functions
```

## Local Development

### Frontend

1. Navigate to the frontend directory:
```
cd frontend
```

2. Install dependencies:
```
npm install
```

3. Start development server:
```
npm run dev
```

### Backend

1. Navigate to the backend directory:
```
cd backend
```

2. Create and activate a virtual environment:
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```
pip install -r requirements.txt
```

4. Start the Flask server:
```
python main.py
```
The backend API will be available at http://localhost:8080

## Firebase Features Used

- **Firebase Authentication**: User authentication with Google and Email/Password
- **Firebase Hosting**: Frontend web application hosting
- **Cloud Functions for Firebase**: Serverless backend API
- **Firestore Database**: Data storage for user information and itineraries

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
python main.py
```
The backend API will be available at http://localhost:8080

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
