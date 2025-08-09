import { StyleSheet, Text, View, TextInput, Button, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// Update import path
import { addTodo } from '../services/todoService';
import { useNavigation } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this line

export default function AddTodoScreen() {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // Mutation for adding a to-do item
  // Modify the onSuccess callback of addMutation
  const addMutation = useMutation({
    mutationFn: addTodo,
    onSuccess: async (newTodo) => {
      // Add debug log to check the structure of the API response
      console.log('API returned new todo:', newTodo);

      try {
        const existingTodos = JSON.parse(await AsyncStorage.getItem('@todos')) || [];

        // Check existing IDs and generate a new ID until it is unique
        const existingIds = existingTodos.map(todo => todo.id);
        let newId = Date.now() + Math.floor(Math.random() * 1000);
        while (existingIds.includes(newId)) {
          newId = Date.now() + Math.floor(Math.random() * 1000);
        }

        // Ensure the new to-do item has the correct structure
        const todoToAdd = {
          id: newId, // Use the conflict-checked ID
          title: newTodo.title || title.trim(),
          completed: newTodo.completed || false,
          userId: newTodo.userId || 1,
          dueDate: newTodo.dueDate || dueDate.toISOString()
        };
        
        const updatedTodos = [...existingTodos, todoToAdd];
        console.log('Updated to-do list:', updatedTodos);
        
        await AsyncStorage.setItem('@todos', JSON.stringify(updatedTodos));
        
        // Add cache invalidation
        queryClient.invalidateQueries({ queryKey: ['todos'] });
        Alert.alert('Success', 'To-do item added');
        navigation.goBack();
      } catch (error) {
        console.error('Failed to save to local storage:', error);
        Alert.alert('Error', 'Save failed, please try again');
      }
    },
    onError: (error) => {
      Alert.alert('Error', `Add failed: ${error.message}`);
    },
  });

  // Handle date selection
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Check if the selected date is before today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        Alert.alert(
          'Date Notice',
          `The date you selected ${selectedDate.toLocaleDateString()} is in the past. Do you still want to add it?`,
          [
            { text: 'Confirm', style: 'default', onPress: () => setDueDate(selectedDate) },
            { text: 'Reselect', style: 'cancel', onPress: () => setShowDatePicker(true) }
          ]
        );
      } else {
        setDueDate(selectedDate);
      }
    }
  };

  // Handle time selection
  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(dueDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDueDate(newDate);
    }
  };

  // Show date picker
  const showDatePickerDialog = () => {
    setShowDatePicker(true);
  };

  // Show time picker
  const showTimePickerDialog = () => {
    setShowTimePicker(true);
  };

  // Handle form submission
  // Modify the submission data to include userId
  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Input Error', 'Please enter a to-do title');
      return;
    }

    // Add debug log to check the submitted data
    const newTodoData = {
      title: title.trim(),
      completed: false,
      userId: 1,
      dueDate: dueDate.toISOString() // Add date field
    };
    console.log('Submitted to-do data:', newTodoData);

    addMutation.mutate(newTodoData);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New To-Do</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter to-do title"
        value={title}
        onChangeText={setTitle}
        autoFocus
      />

      <View style={styles.dateContainer}>
        <Button
          title="Select Due Date"
          onPress={showDatePickerDialog}
          color="#017BFF"
        />
        <Text style={styles.dateText}>
          Selected: {dueDate.toLocaleDateString()}
        </Text>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      <View style={styles.dateContainer}>
        <Button
          title="Set Reminder Time"
          onPress={showTimePickerDialog}
          color="#017BFF"
        />
        <Text style={styles.dateText}>
          Reminder Time: {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {showTimePicker && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display="spinner"
            onChange={handleTimeChange}
          />
        )}
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          color="#017BFF"
        />
        <Button
          title="Add"
          onPress={handleSubmit}
          color="#017BFF"
          disabled={addMutation.isPending}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  input: {
    height: 48,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: 'white',
  },
  dateContainer: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
  },
});