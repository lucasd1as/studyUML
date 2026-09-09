import { blank, diag, mc, tf, type LessonDef } from "../../define";

const SECTION = "Utilities › Smart Pointers › The Problem with Ownership";

export const problemWithOwnership: LessonDef = {
  slug: "problem-with-ownership",
  title: "The Problem with Ownership",
  intro: "Every heap object needs exactly one piece of code responsible for deleting it. Raw pointers do not say who that is.",
  sourceSection: SECTION,
  questions: [
    mc(
      1,
      "In C++, what does it mean for a piece of code to **own** a heap-allocated object?",
      [
        { text: "It is responsible for eventually releasing (deleting) the object.", correct: true },
        {
          text: "It holds the only pointer to the object.",
          why: "Many pointers can refer to one object. Ownership is about who must clean up, not how many people are looking.",
        },
        {
          text: "It is the code that called `new`.",
          why: "Whoever allocates often owns at first, but ownership can be handed to a caller, a container, or a smart pointer.",
        },
        {
          text: "It declared the pointer inside the same function.",
          why: "Scope of a pointer variable says nothing about who deletes what it points to.",
        },
      ],
      "Ownership is a responsibility, not a property of the pointer: the owner is whoever must `delete` the object exactly once. Raw pointers carry no record of this, which is the root problem smart pointers fix.",
    ),
    tf(
      1,
      "If you forget to `delete` a heap object, C++ eventually frees it automatically when the program's garbage collector runs.",
      false,
      "Standard C++ has no garbage collector. A heap object that is never deleted stays allocated until the process exits: a memory leak. In a long-running program leaks accumulate until the process runs out of memory.",
      { whyWrong: "That is Java and C#. C++ frees heap memory only when someone calls `delete` (or a destructor does it for them)." },
    ),
    blank(
      2,
      "Fill in the blank so the happy path releases the `Widget`.",
      `void process() {
    Widget* w = new Widget();
    if (!w->ready()) {
        return;           // (1)
    }
    w->run();
    ____ w;               // (2)
}`,
      "delete",
      "`delete w;` releases the object on the normal path. Notice that the early `return` at (1) still leaks: every extra exit path is another place to forget. That is why the fix is not more `delete` calls but an object whose destructor does it for you (RAII).",
    ),
    diag(
      2,
      "What is wrong with this function?",
      `int* makeCounter() {
    int count = 0;
    return &count;
}`,
      [
        {
          text: "It returns the address of a local variable that is destroyed when the function returns: a dangling pointer.",
          correct: true,
        },
        { text: "`count` is uninitialised.", why: "`count` is explicitly initialised to 0. The problem is its lifetime, not its value." },
        { text: "The return type should be `int`, not `int*`.", why: "Changing the return type would fix it by accident. The actual bug is returning a pointer to storage that no longer exists." },
        { text: "Nothing: `count` lives until the caller finishes using it.", why: "Locals live on the stack frame of the function that declared them; that frame is gone the moment the function returns." },
      ],
      "`count` lives on the stack frame of `makeCounter`, which is torn down at `return`. The caller receives a pointer to memory that may already be reused. Using it is undefined behaviour. The fix is to return by value, or to allocate on the heap and give the caller ownership, ideally via a smart pointer.",
    ),
    mc(
      3,
      "What does RAII (Resource Acquisition Is Initialization) guarantee about a resource held by a stack object?",
      [
        {
          text: "The resource is released in the object's destructor, so it is freed when the object goes out of scope, including when an exception unwinds the stack.",
          correct: true,
        },
        { text: "The resource is released when the program exits.", why: "That would be a leak with extra steps. RAII ties the release to the *scope* of the owning object." },
        { text: "The resource is released when the pointer is set to `nullptr`.", why: "Assigning `nullptr` to a raw pointer changes the pointer, not the object. Nothing is freed." },
        { text: "The resource is released by a background garbage collector.", why: "C++ has no garbage collector. RAII is deterministic: the destructor runs at a known point." },
      ],
      "RAII binds a resource's lifetime to an object's lifetime. Because C++ runs destructors deterministically when scope ends, on every exit path, including exceptions, the resource cannot be forgotten. `std::unique_ptr` and `std::shared_ptr` are RAII wrappers around heap objects.",
    ),
    blank(
      3,
      "Complete the special member function so the file is closed when a `FileHandle` goes out of scope.",
      `struct FileHandle {
    FILE* f;
    explicit FileHandle(const char* path) : f(std::fopen(path, "r")) {}
    ____() { if (f) std::fclose(f); }
};`,
      "~FileHandle",
      "The destructor `~FileHandle()` runs automatically whenever a `FileHandle` is destroyed. Putting the cleanup there is the whole RAII idea: acquire in the constructor, release in the destructor, and let scope do the bookkeeping.",
    ),
  ],
};
