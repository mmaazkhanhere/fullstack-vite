from fastapi import FastAPI
from sqlmodel import SQLModel, Field, create_engine, Session #orm to interact with SQL
#databases using Python

from contextlib import asynccontextmanager #used for creating async context managers
#which are used to manage async resources or operations, ensuring proper setup and cleanup
from app import settings

# Step 1: Database Table SCHEMA
class Todo(SQLModel, table=True): #class inheriting from sqlmodel which represents the
    #schema of a table in the databases
    id: int | None = Field(default=None, primary_key=True)
    title: str
    description: str


# Connection to the database
conn_str: str = str(settings.DATABASE_URL).replace(
    "postgresql", "postgresql+psycopg"
) #connection for the database is obtained from settings and is transformed
# to make it compatible with psycopg, which is a PostgreSQL adapter for Python.
# The connection string is modified because SQLAlchemy recognizes different
# database dialects the above modification is the dialect that specifies the use
# of psycopg as the database adapter

# A database dialect is a system for converting SQL statements and database types
# from a particular SQL database into a standardized format that can be understood 
# by SQLAlchemy

# A database adapter is a software library or module that allows a Python application
# to communicate with a specific type of database

engine = create_engine(conn_str)

def create_db_tables(): #function defined to create database tables and is called
    #during server startup
    
    print("create_db_tables")
    SQLModel.metadata.create_all(engine) #creates tables
    print("done")

@asynccontextmanager #it is used to ensure that database tables are created
#asynchronously during the server startup, allowing the FastAPI application to
# start handling requests while the database initialization is ongoing in the
#background
async def lifespan(todo_server: FastAPI): #async context manager for managing
    # the startup and shutdown lifecycle of the FastAPI application
    print("Server Startup")
    create_db_tables() #create database tables if they don't already exist
    yield #after performing the startup actions, the life span context manager
    # yield control back to the caller
    
# Yielding control means temporarily pausing the execution of a block of code
# and transferring control back to the caller allowing the caller to execute
# other code before returning to the paused block of code

# Table Data Save, Get

todo_server: FastAPI = FastAPI(lifespan=lifespan) #FastAPI instance is created and
# the lifespan parameter is set to previously defined async context managers


@todo_server.post("/todo") #Post route is defined which expects a JSON input matching
# the Todo model.
def create_todo(try_content: Todo): #function which creates a new database session,
    #the input data is added to the session, committed, refreshed to obtain the
    #auto-generated id and the session os closed before returning the data
        session = Session(engine)
        session.add(try_content)
        session.commit()
        session.refresh(try_content)
        session.close()
        return try_content