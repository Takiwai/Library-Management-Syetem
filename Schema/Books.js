const mongoose=require("mongoose")

const bookSchema=new mongoose.Schema({
    title: {type:String,require:true},
   author: {type:String,require:true},
   isbn: {type:String,require:true,unique:true},
   publishedDate: {type:Date,default:Date.now},
   totalCopies: {type:Number,require:true},
   availableCopies: {type:Number,require:true},
    genre: {type:String,require:true},
    borrowers: [{ 
        type: mongoose.Schema.Types.ObjectId,  // Reference to the User model
        ref: 'User'  // The name of the User model
      }]

})
const Books=mongoose.model("Books",bookSchema)

module.exports=Books