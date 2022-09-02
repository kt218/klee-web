#include <klee/klee.h>
#include <assert.h>
#include <stdio.h>

void sort(int[], int);
int is_sorted(int[], int);
void print_arr(int[], int);
int array_equals(int[], int[], int);
int elems_equals(int[], int[], int);

int main() {
    // Tests for empty arrays are ignored due to undefined behaviours
    // Tests for singular arrays
    int one_arr[1] = {5};
    sort_solution(one_arr, 1);
    assert(is_sorted(one_arr, 1));

    // Size defined due to limitations of symbolic execution
    int size = 5;
    int arr[size];
    int arr2[size];
    klee_make_symbolic(&arr, sizeof(arr), "arr");
    klee_make_symbolic(&arr2, sizeof(arr2), "arr2");
    klee_assume(array_equals(arr, arr2, size));
    printf(">>>> in: arr size %d\n", size);
    printf("arr: ");
    print_arr(arr, size);
    sort(arr2, size);
    printf(">>>> your array: ");
    print_arr(arr2, size);
    printf("==============================================================\n");
    assert(is_sorted(arr2, size));
    assert(elems_equals(arr, arr2, size));
    return 0;
}

int is_sorted(int arr[], int size) {
    int sorted = 1;
    for (int i = 1; i < size; ++i) {
        if (arr[i - 1] > arr[i]) {
            sorted = 0;
            break;
        }
    }
    return sorted;
}

void print_arr(int array[], int size) {
    for(int i = 0; i < size; ++i) {
        if (i == 0) {
            printf("[%d", array[i]);
            continue;
        }
        printf(", %d", array[i]);
        if (i == size - 1 )
            printf("]\n");
    }
}

int array_equals(int arr1[], int arr2[], int size) {
    int equal = 1;
    for (int i = 0; i < size; ++i) {
        equal &= (arr1[i] == arr2[i]);
    }
    return equal;
}

int elems_equals(int arr1[], int arr2[], int size) {
    for (int i = 0; i < size; ++i) {
        for (int j = 0; j < size; ++j) {
            if (arr1[i] == arr2[j]) {
                arr1[i] = arr2[j] = 0;
                break;
            }
        }
    }

    int equals = 1;
    for (int k = 0; k < size; ++k) {
        equals &= arr1[k] == 0 && arr2[k] == 0;
    }
    return equals;
}
