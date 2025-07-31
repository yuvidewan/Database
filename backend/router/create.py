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
    not_nullable: bool
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
    print(f"Attempting to create table '{item.table_name}' in database '{item.db_name}'")
    obj = None
    obj = create_connection(item.username,item.password)
    if obj is None:
        return {"message": "issue with database connection"}
    try:
        cur = obj.cursor()
        cur.execute(f"use {item.db_name}")
        sql = f"create table {item.table_name} ("
        l = len(item.columns)
        for c,i in enumerate(item.columns):
            # print(i)
            sql += i.name + f" {i.data_type}"
            if i.length is not None:
                sql += f" ({i.length})"
            if i.is_primary_key == True:
                sql += f" primary key"
            if i.not_nullable == True and i.is_primary_key == False:
                sql += f" not null"
            if c < l-1:
                sql += " ,"
        sql += ")"
        print(sql)
        cur.execute(sql)
        obj.commit()
    except Exception as e:
        print(e)
        obj.rollback()
        return HTTPException(
                status_code= 304,
                detail="data not updated"
            )
    return {"message": "Table creation endpoint hit successfully"}