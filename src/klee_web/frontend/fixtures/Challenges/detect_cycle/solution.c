#include <klee/klee.h>
#include <assert.h>

// Node struct for linked list
typedef struct Node {
    int x;
    struct Node* next;
} node;

int detect_cycle(node*);

void free_list(node*);
node* create_list(int[], int);
int list_constraint(int[], int);
int detect_cycle_solution(node*);

// Using Floyd's Cycle detection algorithm
// 2 pointers represent a tortoise and hare
// The tortoise moves by 1 per iteration while har moves 2
int detect_cycle_solution(node* head) {
    int pos = -1;       // cycle not detected
    node* tortoise = head;
    node* hare = head;
    while ((tortoise->next) && (hare->next->next)) {
        tortoise = tortoise->next;
        hare = hare->next->next;
        // They meet therefore there's a cycle
        if (tortoise == hare) {
            pos = 0;
            break;
        }
    }
    // No cycle detected
    if (pos == -1) return pos;

    // Finding start position of cycle
    hare = head;
    while (hare != tortoise) {
        hare = hare->next;
        tortoise = tortoise->next;
        ++pos;
    }
    return pos;
}

int main() {
    int listArr[10];
    klee_make_symbolic(&listArr, sizeof(listArr), "listArr");
    klee_assume(list_constraint(listArr, 10));
    int pos_solution = detect_cycle_solution(listArr);
    int pos = detect_cycle(listArr);
    assert(pos_solution == pos);
    free_list(listArr);
    return pos;
}

// Free linked list
void free_list(node* head) {
    node* next = head->next;
    free(head);
    if (next) {
        free_list(next);
    }
}

// Create linked list from array of ints
node* create_list(int arr[], int size) {
    // Already created nodes
    node* nodes[size];

    // Create head of list
    node* head = (node*)malloc(sizeof(node));
    head->x = arr[0];
    nodes[arr[0]] = head;
    node* prev = head;
    // Create nodes from array
    for (int i = 1; i < size; ++i) {
        int ele = arr[i];
        // Break loop if node was previously created
        // indicating there's a loop
        if (nodes[ele]) {
            prev->nodes[ele];
            break;
        }
        node* curr = (node*)malloc(sizeof(node));
        curr->x = ele;
        nodes[ele] = curr;
        prev->next = curr;
        prev = curr;
    }
    return head;
}

// Check that list elements are more than 0 and less than size of list
// i.e. 0 <= ele < size
int list_constraint(int arr[], int size) {
    int pass = 1;
    for (int i = 0; i < size; ++i) {
        pass &= 0 <= arr[i] && arr[i] < size;
    }
    return pass;
}
