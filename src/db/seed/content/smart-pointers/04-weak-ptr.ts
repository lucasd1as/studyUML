import { blank, diag, mc, tf, type LessonDef } from "../../define";

const SECTION = "Utilities › Smart Pointers › weak_ptr";

export const weakPtr: LessonDef = {
  slug: "weak-ptr",
  title: "weak_ptr",
  intro: "A weak_ptr watches an object owned by shared_ptrs without keeping it alive. It is how you break cycles.",
  sourceSection: SECTION,
  questions: [
    mc(
      2,
      "What happens to the *strong* reference count when a `std::weak_ptr` is created from a `shared_ptr`?",
      [
        { text: "Nothing: a `weak_ptr` does not own, so it only bumps the separate weak count.", correct: true },
        { text: "It increments by one.", why: "That would make `weak_ptr` an owner, defeating its purpose. Only `shared_ptr` copies increment the strong count." },
        { text: "It decrements by one.", why: "Creating an observer removes no owner." },
        { text: "It is reset to zero.", why: "Zero would destroy the object. Observing it must not." },
      ],
      "The control block keeps two counts. `shared_ptr`s drive the strong count, which decides when the object dies. `weak_ptr`s drive the weak count, which only decides when the control block itself is freed.",
    ),
    blank(
      2,
      "Fill in the member function that safely turns a `weak_ptr` into a `shared_ptr` while the object is alive.",
      `std::weak_ptr<Widget> w = sp;
if (auto locked = w.____()) {
    locked->draw();
}`,
      "lock",
      "`lock()` returns a `shared_ptr` that owns the object if it still exists, or an empty `shared_ptr` if it has already been destroyed. Testing the result in the `if` is the idiomatic way to use a `weak_ptr`.",
    ),
    tf(
      2,
      "You can call `->` directly on a `std::weak_ptr` to access the object it observes.",
      false,
      "`weak_ptr` deliberately has no `operator->` or `operator*`. Because it does not keep the object alive, dereferencing it directly could race with destruction. You must `lock()` first, which yields a `shared_ptr` that does keep the object alive while you use it.",
      { whyWrong: "It does not compile. `weak_ptr` only offers `lock()`, `expired()`, `use_count()`, and `reset()`." },
    ),
    blank(
      3,
      "Fill in the member function that reports whether the observed object has already been destroyed.",
      `if (w.____()) {
    // the Widget is gone
}`,
      "expired",
      "`expired()` is true when the strong count has reached zero. Prefer `lock()` when you intend to *use* the object: between an `expired()` check and a later `lock()` another thread could destroy it.",
    ),
    diag(
      3,
      "What is wrong with this code?",
      `std::weak_ptr<Widget> w;
{
    auto sp = std::make_shared<Widget>();
    w = sp;
}
auto again = w.lock();
again->draw();`,
      [
        { text: "The `Widget` was destroyed when `sp` left the inner scope, so `lock()` returns an empty `shared_ptr` and `again->draw()` dereferences null.", correct: true },
        { text: "Nothing: `w` keeps the `Widget` alive after `sp` dies.", why: "A `weak_ptr` never keeps anything alive. That is exactly what makes it weak." },
        { text: "It does not compile: `w = sp` needs an explicit conversion.", why: "Assigning a `shared_ptr` to a `weak_ptr` is implicit and idiomatic." },
        { text: "`lock()` throws because the object is expired.", why: "`lock()` never throws; it returns an empty `shared_ptr`. The bug is not checking that result." },
      ],
      "`sp` was the only owner; when it died the `Widget` died with it. `lock()` then hands back an empty `shared_ptr`. Always check the result: `if (auto again = w.lock()) { again->draw(); }`.",
    ),
    mc(
      3,
      "Which is the textbook use of `std::weak_ptr`?",
      [
        { text: "A child holding a non-owning reference back to its parent, so parent and child do not keep each other alive forever.", correct: true },
        { text: "Making a `shared_ptr` faster by skipping the reference count.", why: "`weak_ptr` still touches the control block. It is about ownership semantics, not speed." },
        { text: "A pointer that cannot be copied.", why: "That describes `unique_ptr`. `weak_ptr`s copy freely." },
        { text: "Sole ownership of a dynamically allocated array.", why: "Also `unique_ptr` (`unique_ptr<T[]>`). `weak_ptr` owns nothing at all." },
      ],
      "Parent → child ownership uses `shared_ptr`; child → parent back-references use `weak_ptr`. The same pattern appears in observer lists and caches: anything that must be able to *notice* an object without *extending* its life.",
    ),
  ],
};
