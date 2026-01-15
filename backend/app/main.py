from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, users, interests, availability, discover, groups

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="API for facilitating real-world meetups based on shared interests",
    version="0.1.0",
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(interests.router)
app.include_router(availability.router)
app.include_router(discover.router)
app.include_router(groups.router)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "message": f"Welcome to {settings.app_name} API",
        "docs": "/docs",
        "health": "/health",
    }
