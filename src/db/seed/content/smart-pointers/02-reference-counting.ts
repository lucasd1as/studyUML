import { blank, diag, mc, tf, type LessonDef } from "../../define";

const SECTION = "Utilities › Smart Pointers › Reference Counting";

export const referenceCounting: LessonDef = {
  slug: "reference-counting",
  title: "Reference Counting",
  intro: "Shared ownership works by counting owners. When the last one lets go, the object is destroyed.",
  sourceSection: SECTION,
  questions: [
    mc(
      1,
      "What does a reference count keep track of?",
      [
        { text: "How many owners currently share the object.", correct: true },
        { text: "How many times the object has been copied in total.", why: "A count only goes up *and down*. It reflects the owners alive right now, not history." },
        { text: "The size of the object in bytes.", why: "Size is fixed by the type. The count is about ownership." },
        { text: "How many functions have accessed the object.", why: "Reading through a pointer does not change ownership and does not touch the count." },
      ],
      "A reference count is the number of live owners. Each new owner increments it, each departing owner decrements it, and the object is destroyed when it reaches zero.",
    ),
    mc(
      2,
      "Where does `std::shared_ptr` keep its reference count?",
      [
        { text: "In a separately allocated control block that every copy of the `shared_ptr` points to.", correct: true },
        { text: "Inside each `shared_ptr` object.", why: "Then two copies would each have their own count and could never agree. The count must be shared." },
        { text: "Inside the managed object itself.", why: "`shared_ptr` works with types that know nothing about it, such as `int`. The count cannot live there." },
        { text: "In a global table keyed by address.", why: "There is no global registry. Every group of owners has its own control block." },
      ],
      "All copies of a `shared_ptr` point at one control block holding the strong count, the weak count, and the deleter. `std::make_shared` allocates the object and its control block in a single allocation.",
    ),
    blank(
      2,
      "Fill in the member function so the program prints `3`.",
      `auto a = std::make_shared<int>(7);
auto b = a;
auto c = a;
std::cout << a.____();   // prints 3`,
      "use_count",
      "`use_count()` returns the number of `shared_ptr` instances currently owning the object. `a`, `b`, and `c` all own the same `int`, so it prints 3. Treat it as a debugging aid: in multithreaded code the value can be stale by the time you read it.",
    ),
    tf(
      3,
      "Reference counting automatically reclaims two objects that point at each other once nothing else refers to them.",
      false,
      "Two objects holding `shared_ptr`s to each other keep each other's count at one forever, even after every outside owner is gone. This is a reference cycle, and it is the one leak `shared_ptr` cannot prevent on its own. `std::weak_ptr` exists to break such cycles.",
      { whyWrong: "Each object is still an owner of the other, so neither count ever reaches zero." },
    ),
    diag(
      3,
      "`n1` and `n2` go out of scope. What happens?",
      `struct Node {
    std::shared_ptr<Node> next;
    std::shared_ptr<Node> prev;
};

auto n1 = std::make_shared<Node>();
auto n2 = std::make_shared<Node>();
n1->next = n2;
n2->prev = n1;`,
      [
        { text: "Both nodes leak: each still holds a strong reference to the other, so neither count reaches zero.", correct: true },
        { text: "Both nodes are destroyed when the last local goes out of scope.", why: "The locals are gone, but `n1->next` and `n2->prev` are still owners. The counts drop to 1, not 0." },
        { text: "Only the first node is destroyed.", why: "The situation is symmetric; neither node can be destroyed while the other holds it." },
        { text: "It does not compile: a struct cannot contain a `shared_ptr` to its own type.", why: "It compiles fine. A `shared_ptr<Node>` inside `Node` is legal and common (linked lists)." },
      ],
      "This is the classic ownership cycle. After the locals die, each node's count is 1, held by the other node. The standard fix is to make the back-pointer `prev` a `std::weak_ptr<Node>`, which observes without owning.",
    ),
    mc(
      4,
      "Why is copying a `std::shared_ptr` more expensive than copying a raw pointer?",
      [
        { text: "The copy increments the shared reference count, and that increment is an atomic operation.", correct: true },
        { text: "The copy deep-copies the managed object.", why: "Copying a `shared_ptr` never copies the object; both pointers refer to the same one." },
        { text: "The copy allocates a new control block.", why: "The control block is allocated once, when ownership begins. Copies share it." },
        { text: "It is not more expensive.", why: "It is: the count is updated atomically so that owners on different threads stay consistent." },
      ],
      "Every copy and destruction of a `shared_ptr` touches the control block with an atomic increment or decrement so that threads can safely share ownership. That is why hot loops prefer passing a `const T&` or a raw pointer to a callee that does not need ownership.",
    ),
  ],
};
