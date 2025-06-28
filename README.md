# TouchGrass

An interactive web application that helps users explore the world by selecting regions on Google Maps to get AI-suggested itineraries based on geo-location.

*Note: THIS APPLICATION IS NOT YET PUBLISHED, WITH PLANS TO BE PUBLISHED WHEN FUNDS CAN BE SECURED FOR API COSTS. TO USE LOCALLY, FOLLOW THE BELLOW STEPS AND SET UP A FIREBASE, GOOGLE PLACES, AND GOOGLE GEMINI API.

![Screenshot 2025-06-28 at 2 56 08 PM](https://github.com/user-attachments/assets/ba936701-8f0e-499b-bd76-1244f724d247)
Landing Page

![Screenshot 2025-06-28 at 2 56 45 PM](https://github.com/user-attachments/assets/675050c1-a4ed-4591-b5f1-14ba47cc32c7)
Firebase OAuth

![Screenshot 2025-06-28 at 2 59 06 PM](https://github.com/user-attachments/assets/9556f205-8282-4b19-9026-0316e2bc3a5d)
Onboarding

![Screenshot 2025-06-28 at 3 00 51 PM](https://github.com/user-attachments/assets/2cc8335c-a8a7-48f3-b218-86c515a90db8)
Dashboard View

![Screenshot 2025-06-28 at 3 01 09 PM](https://github.com/user-attachments/assets/4e6af8d3-1d27-4c7d-b814-206784e5d2be)
Dasboard View

![Screenshot 2025-06-28 at 3 01 30 PM](https://github.com/user-attachments/assets/dca3b483-8cbf-4d2d-9202-bf6c6e4d725e)
Dashboard View

![Screenshot 2025-06-28 at 3 01 53 PM](https://github.com/user-attachments/assets/7d563dec-9218-4b5a-9d3e-03a0f248dad3)
Geo-Summary (Circle)

![Screenshot 2025-06-28 at 3 02 26 PM](https://github.com/user-attachments/assets/502e944e-3de0-4750-a755-5d8cad90dd9c)
Geo-Summary (Custom)

![Screenshot 2025-06-28 at 3 02 54 PM](https://github.com/user-attachments/assets/be6a1eb4-764a-45c9-b67c-1a65579198cb)
Itinerary Creator

![Screenshot 2025-06-28 at 3 03 22 PM](https://github.com/user-attachments/assets/5491bba3-25ea-4ca3-8932-0712180d0d28)
Itinerary View

![Screenshot 2025-06-28 at 3 03 52 PM](https://github.com/user-attachments/assets/37aa761d-7071-47fc-bca0-172f3b8ea340)
Saved Trips

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
