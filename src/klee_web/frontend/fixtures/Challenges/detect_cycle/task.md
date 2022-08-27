### **Objective:** 
Write function that detects whether a singly-linked list contains a cycle and where the cycle starts from the head.

<br>

An implementation of the singly-linked list is provided by the `node` struct described below:
```c
typedef struct Node {
    int x;
    struct Node* next;
} node;
```

<br>

The function should return -1 for no cycles detect and any integer above zero for any cycle detected and the position at which the cycle starts.

It should also follow the function declaration below:
```c
int detect_cycle(node*);
```
<br>
<br>

### **Example**
 A list:
```
-> 2-> 3 -> 1
```
will return `-1` as there is no cycles.

However, the list below:
```
-> 1 -> 4  -> 3
   ^          |
   |-----------
```
will return `0` for the index of the node where the cycle begins.

Another example list:
```
-> 1 -> 4 -> 2 -> 6 -> 3
             ^         |
             |----------
```
will return `2` which indicates that a cycle exists and it starts at index 2 of the list.