#include <klee/klee.h>
#include <assert.h>
#include <stdio.h>

int is_even(int);
int is_even_solution(int);

int main() {
    int x1, x2;

    klee_make_symbolic(&x1, sizeof(x1), "x1");
    klee_make_symbolic(&x2, sizeof(x2), "x2");
    klee_assume(x1 == x2);
    int sol_out = is_even_solution(x1);
    int out = is_even(x2);
    printf(">>>> in: %d\n", x1);
    printf(">>>> solution out: %d\n", sol_out);
    printf(">>>> your out: %d\n", out);
    printf("==============================================================\n");
    assert(sol_out == out);
    return (sol_out == out);
}

int is_even_solution(int x) {
    return (x % 2 == 0);
}
