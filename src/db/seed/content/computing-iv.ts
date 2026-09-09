import type { CourseDef } from "../define";
import { smartPointerLessons } from "./smart-pointers";

/**
 * The real chapter list of the Computing IV textbook. Every unit and skill is seeded so the tree has its
 * true shape; only Smart Pointers carries lessons and questions in Phase 0.
 */
export const computingIV: CourseDef = {
  slug: "computing-iv",
  title: "Computing IV",
  description: "C++ language features, STL utilities, design patterns, and the tooling around them.",
  units: [
    {
      slug: "cpp-language",
      title: "C++ Language",
      skills: [
        { slug: "namespaces", title: "Namespaces" },
        { slug: "inheritance", title: "Inheritance" },
        { slug: "friends", title: "Friends" },
        { slug: "operator-overloading", title: "Operator Overloading" },
        { slug: "templates", title: "Templates" },
      ],
    },
    {
      slug: "utilities",
      title: "Utilities",
      skills: [
        { slug: "unit-testing", title: "Unit Testing" },
        {
          slug: "smart-pointers",
          title: "Smart Pointers",
          description: "Who deletes what, and how unique_ptr, shared_ptr, and weak_ptr answer that question for you.",
          lessons: smartPointerLessons,
        },
        { slug: "function-pointers", title: "Function Pointers" },
        { slug: "algorithm", title: "<algorithm>" },
        { slug: "exceptions", title: "Exceptions" },
        { slug: "chrono", title: "<chrono>" },
        { slug: "random", title: "<random>" },
        { slug: "regex", title: "<regex>" },
        { slug: "time", title: "Time" },
        { slug: "threads", title: "Threads" },
      ],
    },
    {
      slug: "design-patterns",
      title: "Design Patterns",
      skills: [
        { slug: "factory-method", title: "Factory Method" },
        { slug: "composite", title: "Composite" },
        { slug: "decorator", title: "Decorator" },
        { slug: "observer", title: "Observer" },
        { slug: "adapter", title: "Adapter" },
        { slug: "model-view-controller", title: "Model-View-Controller" },
        { slug: "singleton", title: "Singleton" },
        { slug: "flyweight", title: "Flyweight" },
        { slug: "iterator", title: "Iterator" },
      ],
    },
    {
      slug: "miscellaneous",
      title: "Miscellaneous",
      skills: [
        { slug: "makefiles", title: "Makefiles" },
        { slug: "valgrind", title: "Valgrind" },
        { slug: "gdb", title: "GDB" },
        { slug: "big-oh-notation", title: "Big-Oh Notation" },
        { slug: "top-down-design", title: "Top-Down Design" },
        { slug: "dynamic-programming", title: "Dynamic Programming" },
        { slug: "defensive-programming", title: "Defensive Programming" },
      ],
    },
  ],
};
