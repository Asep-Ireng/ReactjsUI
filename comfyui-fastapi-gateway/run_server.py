
import uvicorn

if __name__ == "__main__":
    print("Starting Server on 0.0.0.0:8000...")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
