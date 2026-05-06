import mongoose, { Schema, Document } from "mongoose"

export interface UserCar extends Document {
  _id:mongoose.Types.ObjectId;
  title:string;
  slug:string;
  category:string;
  type:string;
  pricePerDay:number;
  capacity:number;
  fuelType:string;
  transmission:"Automatic"|"Manual"|string;
  imageUrl:string;
}

const CarSchema = new Schema<UserCar>(
  {
   title:{
    type: String,
    required:true,
    trim:true,
  },
  slug:{
   type: String,
   unique:true,
   lowercase:true,
   trim:true,
  },
  category:{
    type: String,
    required:true,
    trim:true,
    uppercase:true,
  },
  type:{
    type: String,
    required:true,
    trim:true,
    uppercase:true,
  },
  pricePerDay:{
    type: Number,
    required:true,
    min:[0,"Price per day cannot be negative"],
  },
  capacity:{
    type:Number,
    required:true,
    min:[1,"Capacity must be at least 1"],
  },
  fuelType:{
    type: String,
    required:true,
    trim:true,    uppercase:true,
  },
  transmission:{
    type: String,
    required:true,
    trim:true,
    uppercase:true,
    enum:["Automatic","Manual"]
  },
  imageUrl:{
    type: String,
    required:true,
    trim:true,
  },
},
{
  timestamps:true,
  toJSON:{virtuals:true},
  toObject:{virtuals:true},
}
);

CarSchema.index({ slug: 1 });
CarSchema.index({ category: 1 });
CarSchema.index({ type: 1 });
CarSchema.index({ pricePerDay: 1 });
CarSchema.index({ title: 1 });

CarSchema.pre("validate",async function(this:UserCar){
  if(this.title && (this.isNew || this.isModified("title"))){
    const baseSlug = this.title
    .toLowerCase()
    .replace(/\s+/g, "-")       // replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "") // remove special characters
    .replace(/-+/g, "-")        
    .trim();

    const randomNum = Math.floor(10000000 + Math.random()*90000000); // generate random 8 digit number
    this.slug = `${baseSlug}-${randomNum}`;
  }
});

const Car = mongoose.models.Car || mongoose.model<UserCar>("Car", CarSchema);

export default Car;