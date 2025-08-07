import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { updateTodo } from '../services/todoService';

export default function EditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { todo: todoString } = useLocalSearchParams();
  
  // 解析待办事项数据
  const todo = todoString ? JSON.parse(todoString) : { id: null, title: '' };
  const [title, setTitle] = useState(todo.title || '');

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('错误', '请输入待办事项内容');
      return;
    }

    try {
      const updatedTodo = { ...todo, title: title.trim() };
      await updateTodo(updatedTodo);
      
      // 刷新待办事项列表
      await queryClient.invalidateQueries(['todos']);
      
      // 返回上一页
      router.back();
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
      console.error('保存错误:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="输入待办事项"
        autoFocus
      />
      <Button 
        title="保存" 
        onPress={handleSave}
        color="#007AFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 4,
    fontSize: 16,
  },
});