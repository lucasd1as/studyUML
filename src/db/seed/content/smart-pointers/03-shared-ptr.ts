import { blank, diag, mc, tf, type LessonDef } from "../../define";

const SECTION = "Utilities › Smart Pointers › shared_ptr";

export const sharedPtr: LessonDef = {
  slug: "shared-ptr",
  title: "shared_ptr",
  intro: "std::shared_ptr is shared ownership done right: copy it to add an owner, let it die to remove one.",
  sourceSection: SECTION,
  questions: [
    blank(
      1,
      "Fill in the function that creates a `shared_ptr` to a `std::string` in a single allocation.",
      `auto p = std::____<std::string>("hello");`,
      "make_shared",
      "`std::make_shared<T>(args...)` constructs the object and its control block together in one allocation, and never leaves a raw `new` lying around to leak. It is the default way to create a `shared_ptr`.",
    ),
    mc(
      2,
      "Which is the preferred way to create a `std::shared_ptr<Widget>`?",
      [
        { text: "`auto w = std::make_shared<Widget>();`", correct: true },
        {
          text: "`std::shared_ptr<Widget> w(new Widget());`",
          why: "This works, but it performs two allocations (object and control block) and, inside a larger expression, can leak if another argument throws between `new` and the constructor.",
        },
        { text: "`std::shared_ptr<Widget> w = new Widget();`", why: "Does not compile: the constructor taking a raw pointer is `explicit`, precisely so that ownership transfer is always visible." },
        { text: "`auto w = std::shared_ptr<Widget>::make();`", why: "There is no such static member function." },
      ],
      "`std::make_shared` is the idiomatic choice: one allocation, no naked `new`, and exception safety by construction. Constructing from a raw pointer is reserved for cases where you need a custom deleter or already hold a pointer from a C API.",
    ),
    tf(
      3,
      "Moving a `shared_ptr` into another `shared_ptr` increments the reference count.",
      false,
      "A move transfers ownership: the source becomes empty and the destination takes its place, so the number of owners is unchanged and the count is not touched. Only a *copy* adds an owner.",
      { whyWrong: "Copy adds an owner and bumps the count. Move hands over the existing share; the count stays put." },
    ),
    diag(
      3,
      "What is wrong with this code?",
      `Widget* raw = new Widget();
std::shared_ptr<Widget> a(raw);
std::shared_ptr<Widget> b(raw);`,
      [
        { text: "`a` and `b` each create their own control block, so the `Widget` will be deleted twice.", correct: true },
        { text: "Nothing: both point at the same object and the count is 2.", why: "They point at the same object but do not know about each other. Each believes it is the sole owner." },
        { text: "It does not compile: a raw pointer cannot initialise two `shared_ptr`s.", why: "It compiles. The compiler has no way to know the pointer was already adopted." },
        { text: "`b` is left empty because the pointer was already owned.", why: "`shared_ptr` does not track raw pointers globally; `b` happily takes ownership too." },
      ],
      "Ownership must begin exactly once. Construct the first `shared_ptr` from the raw pointer (or better, use `make_shared`) and then *copy* it: `auto b = a;`. Two independent adoptions of one raw pointer is a guaranteed double delete.",
    ),
    blank(
      3,
      "Fill in the member function that makes `p` give up its share of ownership and become empty.",
      `auto p = std::make_shared<Widget>();
// ...
p.____();   // p no longer owns anything`,
      "reset",
      "`reset()` releases this `shared_ptr`'s ownership. If it was the last owner, the `Widget` is destroyed; otherwise the count simply drops by one. `p` is empty afterwards (`p == nullptr`).",
    ),
    mc(
      4,
      "A function only *uses* a `Widget` while it runs and never stores it. What is the best parameter type?",
      [
        { text: "`const Widget&` (or `Widget*`): pass the object, not the smart pointer.", correct: true },
        { text: "`std::shared_ptr<Widget>` by value.", why: "By value means the callee becomes an owner, costing an atomic increment and decrement. It only makes sense when the callee will *keep* a copy." },
        { text: "`const std::shared_ptr<Widget>&`.", why: "Avoids the count traffic, but forces every caller to have a `shared_ptr`. A function that just uses a `Widget` should not care how it is owned." },
        { text: "`std::shared_ptr<Widget>&&`.", why: "An rvalue reference says 'I will take ownership away from you'. That is the opposite of just using the object." },
      ],
      "Smart pointer parameters express ownership intent. Pass `shared_ptr` by value only when the callee will store a share. If it just uses the object, take `const Widget&` or `Widget*`: cheaper, and callable whether the caller holds a `shared_ptr`, a `unique_ptr`, or a stack object.",
    ),
  ],
};
