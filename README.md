# AWE Project

This project consists of a React frontend built with Vite and a Flask backend.

## Project Structure

- `frontend/`: React application built with Vite
- `backend/`: Flask API

## Setup Instructions

### Prerequisites
- Node.js and npm for the frontend
- Python 3.x for the backend
- Git

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask application:
   ```bash
   flask run
   ```
   or
   ```bash
   python app.py
   ```

   The backend should start running on http://localhost:5000

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install additional required packages:
   ```bash
   npm install @emotion/react @emotion/styled date-fns@2.29.3 @mui/material @mui/system @mui/styled-engine @mui/icons-material @mui/x-date-pickers --save @fortawesome/react-fontawesome
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```

   The frontend should start running on http://localhost:5173

## Development with Vite

Vite provides a faster and leaner development experience compared to Create React App (React Scripts). Some key differences:

- **Faster startup**: Vite doesn't bundle your application during development, leading to faster startup times.
- **Hot Module Replacement (HMR)**: Changes to your code are reflected almost instantly in the browser.
- **Build command**: Use `npm run build` to create a production build.
- **Preview build**: Use `npm run preview` to preview your production build locally.

## Git Instructions

### For Team Members (Cloning the Repository)

To clone this repository:
```bash
git clone <repository-url>
cd awe
```

### Creating a New Branch

1. Fetch the latest updates and switch to the `main` branch:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create a new branch for your work:
   ```bash
   git checkout -b feature-branch-name
   ```
   Replace `feature-branch-name` with a meaningful name related to your work.

### Making Changes & Committing Code

1. Modify the code as needed.
2. Check the changes made:
   ```bash
   git status
   ```
3. Stage the changes:
   ```bash
   git add .
   ```
4. Commit the changes with a meaningful message:
   ```bash
   git commit -m "Your descriptive commit message"
   ```

### Pushing Changes

1. Push your branch to the remote repository:
   ```bash
   git push origin feature-branch-name
   ```

### Creating a Pull Request (PR)

1. Go to the repository on GitHub.
2. Navigate to the **Pull Requests** tab.
3. Click **New Pull Request**.
4. Select your branch and compare it with `main`.
5. Add a title and description explaining your changes.
6. Click **Create Pull Request**.
7. Wait for review and approval before merging.

After merging, make sure to pull the latest changes into your local `main` branch:
```bash
git checkout main
git pull origin main
```

## Troubleshooting

If you encounter any issues:

1. Make sure both backend and frontend are running simultaneously.
2. Check that the backend API is accessible from the frontend (CORS issues).
3. Review the console logs in both the terminal and browser developer tools.
4. Ensure all dependencies are correctly installed.
5. If needed, clear npm cache: `npm cache clean --force`

