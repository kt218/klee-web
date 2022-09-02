void sort_solution(int arr[], int size) {
    // Sorting array in ascending order using insertion sort
    // Modifies the array in-place
    for (int i = 1; i < size; ++i) {
        int toInsert = arr[i];
        int j = i - 1;
        while (j >= 0 && toInsert < arr[j]) {
            arr[j + 1] = arr[j];
            --j;
        }
        arr[j + 1] = toInsert;
    }
}