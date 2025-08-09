import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { updateTodo } from '../services/todoService';

export default function EditScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { todo: todoString } = useLocalSearchParams();
  
  // Parse the to-do item data
  const todo = todoString ? JSON.parse(todoString) : { id: null, title: '' };
  const [title, setTitle] = useState(todo.title || '');

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter to-do content');
      return;
    }

    try {
      const updatedTodo = { ...todo, title: title.trim() };
      await updateTodo(updatedTodo);
      
      // Refresh the to-do list
      await queryClient.invalidateQueries(['todos']);
      
      // Go back to the previous page
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Save failed, please try again');
      console.error('Save error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter to-do item"
        autoFocus
      />
      <Button 
        title="Save"
        onPress={handleSave}
        color="#7B68EE"
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