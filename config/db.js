const mongoose=require("mongoose")

const mongoURL='mongodb://localhost:27017/mydatabase'

const connectToDatabase=async function() {
    try{
        await mongoose.connect(mongoURL,{    
        })
        console.log("Connection Successful")
    }
    catch (err){
        console.error("Connection Error "+err)
        process.exit(1)
    }
}
connectToDatabase()
module.exports=mongoose