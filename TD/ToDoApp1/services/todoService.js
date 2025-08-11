import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';


const Storage = {
  getItem: async (key) => {
    // Fix: Directly check if localStorage exists
    if (typeof localStorage !== 'undefined') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    // Fix: Directly check if localStorage exists
    if (typeof localStorage !== 'undefined') {
      return Promise.resolve(localStorage.setItem(key, value));
    }
    return AsyncStorage.setItem(key, value);
  }
};

const API_URL = 'https://dummyjson.com/todos';

// Fetch all to-do items
export const fetchTodos = async () => {
  try {
    // 1. First, try to get from local storage
    const localTodos = await AsyncStorage.getItem('@todos');
    if (localTodos) {
      const parsedTodos = JSON.parse(localTodos);
      console.log('Local storage data:', parsedTodos);
      
      // Deduplication: keep the last occurrence of duplicate IDs
      const uniqueTodos = Array.from(
        new Map(parsedTodos.map(todo => [todo.id, todo])).values()
      );
      
      // Ensure local data has a title field
      const todosWithTitles = uniqueTodos.map(todo => ({
        ...todo,
        title: todo.title || `To-Do Item ${todo.id}`
      }));
      
      return todosWithTitles;
    }

    // 2. If not found locally, fetch from the API
    const response = await axios.get('https://dummyjson.com/todos/user/1');
    // Fix: Correctly handle the API response structure
    const apiTodos = response.data.todos || response.data;
    
    // Ensure each to-do item has a title field
    const todosWithTitles = apiTodos.map(todo => ({
      ...todo,
      title: todo.title || `To-Do Item ${todo.id}`
    }));

    // 3. Save API data to local storage
    await AsyncStorage.setItem('@todos', JSON.stringify(todosWithTitles));
    return todosWithTitles;
  } catch (error) {
    console.error('Failed to fetch to-do items:', error);
    throw error;
  }
};

// Fetch a single to-do item
export const fetchTodo = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// Add a to-do item
export const addTodo = async (todoData) => {
  try {
    const response = await fetch('https://dummyjson.com/todos/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: todoData.title,
        completed: todoData.completed,
        userId: todoData.userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Add failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding to-do:', error);
    throw error;
  }
};

// Update a to-do item
export const updateTodo = async (updatedTodo) => {
  const todos = await fetchTodos();
  const newTodos = todos.map(t => 
    t.id === updatedTodo.id ? updatedTodo : t
  );
  await Storage.setItem('@todos', JSON.stringify(newTodos));
  return updatedTodo;
};

// Delete a to-do item
export const deleteTodo = async (id) => {
  try {
    // 1. Directly manipulate local storage (remove API call)
    const localTodos = await Storage.getItem('@todos');
    if (localTodos) {
      const parsedTodos = JSON.parse(localTodos);
      const updatedTodos = parsedTodos.filter(todo => todo.id !== id);
      await Storage.setItem('@todos', JSON.stringify(updatedTodos));
      return { success: true, id };
    }
    throw new Error('To-do item not found in local storage');
  } catch (error) {
    console.error('Error deleting to-do:', error);
    throw error;
  }
};