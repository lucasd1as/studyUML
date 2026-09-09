import type { LessonDef } from "../../define";
import { problemWithOwnership } from "./01-problem-with-ownership";
import { referenceCounting } from "./02-reference-counting";
import { sharedPtr } from "./03-shared-ptr";
import { weakPtr } from "./04-weak-ptr";
import { uniquePtr } from "./05-unique-ptr";

export const smartPointerLessons: LessonDef[] = [
  problemWithOwnership,
  referenceCounting,
  sharedPtr,
  weakPtr,
  uniquePtr,
];
