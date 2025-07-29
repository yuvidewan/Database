from ..utils.create_db import create_connection
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel
from typing import Optional,List

router = APIRouter(
    prefix = "/create",
    tags=["table creation router"],
    responses = {404:{"message": "not found"}}
)

class ColumnDefinition(BaseModel):
    name: str
    data_type: str
    length: Optional[str] = None
    allow_null: bool
    is_primary_key: bool
    auto_increment: bool

# Pydantic model for the entire request
class CreateTableRequest(BaseModel):
    username: str
    password: str
    db_name: str
    table_name: str
    columns: List[ColumnDefinition]

@router.post("/table")
def create_table(item: CreateTableRequest):
    # Now you can access all the data cleanly via the 'item' object
    # For example: item.table_name, item.columns[0].name, etc.
    
    # --- Your logic to build the CREATE TABLE SQL statement goes here ---
    # Example:
    # "CREATE TABLE `new_table` (`id` INT NOT NULL AUTO_INCREMENT, `name` VARCHAR(255) NOT NULL, PRIMARY KEY (`id`));"
    
    print(f"Attempting to create table '{item.table_name}' in database '{item.db_name}'")
    print("Columns:", item.columns)
    
    return {"message": "Table creation endpoint hit successfully"}