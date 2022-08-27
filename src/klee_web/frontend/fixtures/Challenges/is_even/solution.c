#include <klee/klee.h>
#include <assert.h>

int is_even(int);
int is_even_solution(int);

int main() {
    int x1, x2;

    klee_make_symbolic(&x1, sizeof(x1), "x1");
    klee_make_symbolic(&x2, sizeof(x2), "x2");
    klee_assume(x1 == x2);
    assert(is_even(x1) == is_even_solution(x2));
    return (is_even(x1) == is_even_solution(x2));
}

int is_even_solution(int x) {
    return (x % 2 == 0);
}
