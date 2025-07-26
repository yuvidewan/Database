from fastapi import APIRouter, HTTPException
import mysql.connector as pymysql
router =  APIRouter(
    prefix = "/connection",
    tags = ["Connection Management"],
    responses = {404:{"message": "not found"}}
)

@router.post("/show")
def create_connection(username,password):
    print("here")
    obj = pymysql.connect(
        host = "localhost",
        user = "root",
        password = "root"
    )