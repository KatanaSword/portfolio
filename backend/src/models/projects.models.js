import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [
        {
          url: String,
          publicId: String,
        },
      ],
      default: [],
      required: true,
    },
    github: {
      type: {
        url: String,
      },
      required: true,
    },
    website: {
      type: {
        url: String,
      },
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

projectSchema.plugin(mongooseAggregatePaginate);

export const Project = mongoose.model("Project", projectSchema);
