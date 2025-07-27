from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import mysql.connector as pymysql
from pydantic import BaseModel
from typing import Dict,Any
from ..utils.create_db import create_connection

router = APIRouter(
    prefix = "/edit",
    tags=["data editing router"],
    responses = {404:{"message": "not found"}}
)

# In your edit.py router file

@router.get("/delete")
def remove_row(username: str, password: str, db_name: str, tb_name: str, pk_col: str, ids: str):
    # 'ids' will be a string like "101,102,105"
    ids_to_delete = ids.split(',')

    placeholders = ','.join(['%s'] * len(ids_to_delete))

    sql = f"DELETE FROM `{tb_name}` WHERE `{pk_col}` IN ({placeholders})"

    print(f"Attempting to delete from {tb_name} where {pk_col} is in {ids_to_delete}")
    obj = None
    try:
        obj = pymysql.connect(host = "localhost",user = username,password = password,database = db_name)
        cur = obj.cursor()
        cur.execute(sql,ids_to_delete)
        obj.commit()
    except Exception as e:
        if obj:
            obj.rollback()
        return HTTPException(
            status_code= 304,
            detail="data not deleted"
        )
    
    return {"message": "Deletion successful"}


class InsertData(BaseModel):
    username: str
    password: str
    db_name: str
    tb_name: str
    data: Dict[str,Any]

'''
{
    "username": "root",
    "password": "root",
    "db_name": "my_db",
    "tb_name": "products",
    "data": {
        "id": "106",
        "name": "New Product",
        "price": "99.99",
        "stock_level": null
    }
}
'''
@router.post("/insert")
def insert_rows(item: InsertData):
    columns = ', '.join([f"`{col}`" for col in item.data.keys()])
    values = list(item.data.values())
    values_placeholders = ', '.join(['%s'] * len(item.data))


    sql = f"INSERT INTO `{item.tb_name}` ({columns}) VALUES ({values_placeholders})"
    obj = create_connection(username=item.username, password=item.password)
    if obj:
        try:
            cur = obj.cursor()
            cur.execute(f"use {item.db_name}")
            cur.execute(sql,values)
            obj.commit()
        except Exception as e:
            obj.rollback()
            return HTTPException(
                status_code= 304,
                detail="data not inserted"
            )
    return {"message": "Deletion successful"}
    