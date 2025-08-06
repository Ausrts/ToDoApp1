import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web环境兼容: 使用localStorage代替AsyncStorage
const Storage = {
  getItem: async (key) => {
    // 修复：直接检测localStorage是否存在
    if (typeof localStorage !== 'undefined') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    // 修复：直接检测localStorage是否存在
    if (typeof localStorage !== 'undefined') {
      return Promise.resolve(localStorage.setItem(key, value));
    }
    return AsyncStorage.setItem(key, value);
  }
};

const API_URL = 'https://dummyjson.com/todos';

// 获取所有待办事项
export const fetchTodos = async () => {
  try {
    // 1. 先尝试从本地存储获取
    const localTodos = await Storage.getItem('@todos');
    if (localTodos) {
      const parsedTodos = JSON.parse(localTodos);
      console.log('本地存储数据:', parsedTodos);
      
      // 去重处理：保留最后出现的重复ID项
      const uniqueTodos = Array.from(
        new Map(parsedTodos.map(todo => [todo.id, todo])).values()
      );
      
      // 确保本地数据也有title字段
      const todosWithTitles = uniqueTodos.map(todo => ({
        ...todo,
        title: todo.title || `待办事项 ${todo.id}`
      }));
      
      return todosWithTitles;
    }

    // 2. 本地没有则从API获取
    const response = await axios.get('https://dummyjson.com/todos/user/1');
    // 修复：正确处理API响应结构
    const apiTodos = response.data.todos || response.data;
    
    // 确保每个待办事项都有title字段
    const todosWithTitles = apiTodos.map(todo => ({
      ...todo,
      title: todo.title || `待办事项 ${todo.id}`
    }));

    // 3. 将API数据保存到本地
    await Storage.setItem('@todos', JSON.stringify(todosWithTitles));
    return todosWithTitles;
  } catch (error) {
    console.error('获取待办事项失败:', error);
    throw error;
  }
};

// 获取单个待办事项
export const fetchTodo = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};

// 添加待办事项
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
      throw new Error(errorData.message || '添加失败');
    }

    return await response.json();
  } catch (error) {
    console.error('添加待办错误:', error);
    throw error;
  }
};

// 更新待办事项
export const updateTodo = async (id, todoData) => {
  const response = await axios.put(`${API_URL}/${id}`, todoData);
  return response.data;
};

// 删除待办事项
export const deleteTodo = async (id) => {
  try {
    // 1. 直接操作本地存储（移除API调用）
    const localTodos = await Storage.getItem('@todos');
    if (localTodos) {
      const parsedTodos = JSON.parse(localTodos);
      const updatedTodos = parsedTodos.filter(todo => todo.id !== id);
      await Storage.setItem('@todos', JSON.stringify(updatedTodos));
      return { success: true, id };
    }
    throw new Error('本地存储中未找到待办事项');
  } catch (error) {
    console.error('删除待办错误:', error);
    throw error;
  }
};