import { blank, diag, mc, tf, type LessonDef } from "../../define";

const SECTION = "Utilities › Smart Pointers › unique_ptr";

export const uniquePtr: LessonDef = {
  slug: "unique-ptr",
  title: "unique_ptr",
  intro: "std::unique_ptr is the default smart pointer: one owner, zero overhead, ownership moves but never copies.",
  sourceSection: SECTION,
  questions: [
    mc(
      1,
      "What does `std::unique_ptr` express?",
      [
        { text: "Exactly one owner at a time. Ownership can be moved to someone else, but never copied.", correct: true },
        { text: "A pointer that can never be null.", why: "A `unique_ptr` is null after default construction, after `release()`, and after being moved from." },
        { text: "Shared ownership with a reference count fixed at one.", why: "There is no count at all. `unique_ptr` is as cheap as a raw pointer." },
        { text: "A pointer that is unique across all threads.", why: "Threads are not involved. 'Unique' refers to the number of owners." },
      ],
      "`unique_ptr` is sole ownership made explicit. Because there is exactly one owner there is nothing to count, so it costs the same as a raw pointer while guaranteeing the object is deleted exactly once, when the owner dies.",
    ),
    diag(
      2,
      "What is wrong with this code?",
      `auto a = std::make_unique<Widget>();
std::unique_ptr<Widget> b = a;`,
      [
        { text: "It does not compile: `unique_ptr`'s copy constructor is deleted. Transfer ownership with `std::move(a)`.", correct: true },
        { text: "It compiles and both `a` and `b` own the `Widget`.", why: "Two owners is exactly what `unique_ptr` forbids, and the compiler enforces it." },
        { text: "It compiles and `a` silently becomes null.", why: "That is what a *move* does. A plain copy is rejected at compile time so the transfer is always visible." },
        { text: "It compiles but crashes at runtime with a double delete.", why: "The type system stops you before runtime. That is the point of `unique_ptr` over raw pointers." },
      ],
      "Copying would create two owners and a double delete, so the copy operations are `= delete`. Write `std::unique_ptr<Widget> b = std::move(a);` to hand ownership over; `a` is null afterwards.",
    ),
    blank(
      2,
      "Fill in the function that transfers ownership from `a` to `b`.",
      `auto a = std::make_unique<Widget>();
std::unique_ptr<Widget> b = std::____(a);   // a is now null`,
      "move",
      "`std::move(a)` casts `a` to an rvalue so the move constructor is chosen. `b` takes the `Widget`, and `a` becomes empty. The name is a promise you are making: 'I will not use `a`'s old value again'.",
    ),
    tf(
      3,
      "Calling `release()` on a `unique_ptr` destroys the managed object and sets the pointer to null.",
      false,
      "`release()` gives up ownership *without* deleting: it returns the raw pointer and leaves the `unique_ptr` null, so whoever called it is now responsible for the object. Destroying the object and resetting the pointer is `reset()`.",
      { whyWrong: "That describes `reset()`. `release()` hands you the raw pointer and walks away; the object is still alive." },
    ),
    mc(
      3,
      "Which declaration correctly manages a dynamically allocated array of ten `int`s?",
      [
        { text: "`std::unique_ptr<int[]> p(new int[10]);`", correct: true },
        { text: "`std::unique_ptr<int> p(new int[10]);`", why: "This compiles but calls `delete` instead of `delete[]` on the array: undefined behaviour." },
        { text: "`std::unique_ptr<int*> p(new int[10]);`", why: "`new int[10]` yields an `int*`, not an `int**`. This does not compile." },
        { text: "`std::unique_ptr<int> p = new int[10];`", why: "The raw-pointer constructor is `explicit`, so copy-initialisation from `new` does not compile." },
      ],
      "The array specialisation `unique_ptr<T[]>` uses `delete[]` and provides `operator[]`. Prefer `auto p = std::make_unique<int[]>(10);`, which value-initialises the elements too. In most code a `std::vector<int>` is better still.",
    ),
    blank(
      4,
      "Fill in the function so the factory returns a `Circle` through a `Shape` interface without a naked `new`.",
      `std::unique_ptr<Shape> makeShape() {
    return std::____<Circle>(2.0);   // Circle derives from Shape
}`,
      "make_unique",
      "`std::make_unique<Circle>(2.0)` yields a `unique_ptr<Circle>`, which converts implicitly to `unique_ptr<Shape>` because `Circle` derives from `Shape`. Returning by value moves the pointer out, so the caller becomes the sole owner. This is the standard shape of a factory function in modern C++.",
    ),
  ],
};
