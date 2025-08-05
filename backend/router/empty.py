from fastapi import APIRouter, HTTPException
from ..utils.create_db import create_connection

router = APIRouter(
    prefix = "/empty",
    tags=["table emptying router"],
    responses = {404:{"message": "not found"}}
)

@router.get("/drop")
def drop_table(username: str, password: str, db_name: str, tb_name: str):
    obj = None
    try:
        obj = create_connection(username=username, password=password)
        if obj is None:
            return HTTPException(
                status_code=500,
                detail="could not establish connection to DB"
            )
        cur = obj.cursor()
        cur.execute(f"use {db_name}")
        cur.execute(f"drop table {tb_name}")
        obj.commit()
    except Exception as e:
        obj.rollback()
        return HTTPException(
            status_code=500,
            detail="could not establish connection to DB"
        )
    return {"message" : "table dropped succesfully"}
    

    
@router.get("/clear")
def empty_table(username: str, password: str, db_name: str, tb_name: str):
    obj = None
    try:
        obj = create_connection(username=username, password=password)
        if obj is None:
            return HTTPException(
                status_code=500,
                detail="could not establish connection to DB"
            )
        cur = obj.cursor()
        cur.execute(f"use {db_name}")
        cur.execute(f"truncate {tb_name}")
        obj.commit()
    except Exception as e:
        obj.rollback()
        return HTTPException(
            status_code=500,
            detail="could not establish connection to DB"
        )
    return {"message" : "table truncated succesfully"}