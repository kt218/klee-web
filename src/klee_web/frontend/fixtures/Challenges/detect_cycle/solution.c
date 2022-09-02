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