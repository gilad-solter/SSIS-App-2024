// SSIS Compliance Checker Service
// Based on SSIS compliance guidelines from PROJECT_SPEC.md

/**
 * SSIS Compliance Requirements:
 * - Calories: 200 calories or less
 * - Sodium: 200 mg or less  
 * - Total Fat: 35% of calories or less
 * - Saturated Fat: Less than 10% of calories
 * - Trans Fat: 0 grams
 * - Total Sugars: 35% by weight or less
 */

export const checkSSISCompliance = (nutritionalData) => {
  const results = {
    isCompliant: false,
    passedTests: [],
    failedTests: [],
    complianceDetails: {}
  };

  // Helper function to add test result
  const addTestResult = (testName, passed, value, requirement, explanation) => {
    const result = {
      test: testName,
      passed,
      value,
      requirement,
      explanation
    };

    if (passed) {
      results.passedTests.push(result);
    } else {
      results.failedTests.push(result);
    }

    results.complianceDetails[testName] = result;
  };

  // Test 1: Calories (≤ 200)
  const calories = nutritionalData.calories;
  if (calories !== null && calories !== undefined) {
    const caloriesPass = calories <= 200;
    addTestResult(
      'calories',
      caloriesPass,
      `${calories} calories`,
      '≤ 200 calories',
      caloriesPass ? 'Meets calorie requirement' : `Exceeds limit by ${calories - 200} calories`
    );
  } else {
    addTestResult('calories', false, 'N/A', '≤ 200 calories', 'Calorie information not found');
  }

  // Test 2: Sodium (≤ 200mg)
  const sodium = nutritionalData.sodium;
  if (sodium !== null && sodium !== undefined) {
    const sodiumPass = sodium <= 200;
    addTestResult(
      'sodium',
      sodiumPass,
      `${sodium}mg`,
      '≤ 200mg',
      sodiumPass ? 'Meets sodium requirement' : `Exceeds limit by ${sodium - 200}mg`
    );
  } else {
    addTestResult('sodium', false, 'N/A', '≤ 200mg', 'Sodium information not found');
  }

  // Test 3: Total Fat (≤ 35% of calories)
  const totalFat = nutritionalData.totalFat;
  if (totalFat !== null && totalFat !== undefined && calories !== null && calories !== undefined) {
    const fatCalories = totalFat * 9; // 9 calories per gram of fat
    const fatPercentage = (fatCalories / calories) * 100;
    const fatPass = fatPercentage <= 35;
    addTestResult(
      'totalFat',
      fatPass,
      `${totalFat}g (${fatPercentage.toFixed(1)}% of calories)`,
      '≤ 35% of calories',
      fatPass ? 'Meets fat requirement' : `Exceeds limit by ${(fatPercentage - 35).toFixed(1)}%`
    );
  } else {
    addTestResult('totalFat', false, 'N/A', '≤ 35% of calories', 'Fat or calorie information not found');
  }

  // Test 4: Saturated Fat (< 10% of calories)
  const saturatedFat = nutritionalData.saturatedFat;
  if (saturatedFat !== null && saturatedFat !== undefined && calories !== null && calories !== undefined) {
    const satFatCalories = saturatedFat * 9; // 9 calories per gram of fat
    const satFatPercentage = (satFatCalories / calories) * 100;
    const satFatPass = satFatPercentage < 10;
    addTestResult(
      'saturatedFat',
      satFatPass,
      `${saturatedFat}g (${satFatPercentage.toFixed(1)}% of calories)`,
      '< 10% of calories',
      satFatPass ? 'Meets saturated fat requirement' : `Exceeds limit by ${(satFatPercentage - 10).toFixed(1)}%`
    );
  } else {
    addTestResult('saturatedFat', false, 'N/A', '< 10% of calories', 'Saturated fat or calorie information not found');
  }

  // Test 5: Trans Fat (= 0g)
  const transFat = nutritionalData.transFat;
  if (transFat !== null && transFat !== undefined) {
    const transPass = transFat === 0;
    addTestResult(
      'transFat',
      transPass,
      `${transFat}g`,
      '0g',
      transPass ? 'Meets trans fat requirement' : `Contains ${transFat}g trans fat (must be 0g)`
    );
  } else {
    addTestResult('transFat', false, 'N/A', '0g', 'Trans fat information not found');
  }

  // Test 6: Total Sugars (≤ 35% by weight)
  const totalSugars = nutritionalData.totalSugars;
  const servingWeight = nutritionalData.servingWeightGrams;
  if (totalSugars !== null && totalSugars !== undefined && servingWeight !== null && servingWeight !== undefined) {
    const sugarPercentage = (totalSugars / servingWeight) * 100;
    const sugarPass = sugarPercentage <= 35;
    addTestResult(
      'totalSugars',
      sugarPass,
      `${totalSugars}g (${sugarPercentage.toFixed(1)}% by weight)`,
      '≤ 35% by weight',
      sugarPass ? 'Meets sugar requirement' : `Exceeds limit by ${(sugarPercentage - 35).toFixed(1)}%`
    );
  } else {
    addTestResult('totalSugars', false, 'N/A', '≤ 35% by weight', 'Sugar or serving weight information not found');
  }

  // Determine overall compliance - ALL tests must pass
  results.isCompliant = results.failedTests.length === 0;

  return results;
};

// Helper function to get a summary message
export const getComplianceSummary = (complianceResults) => {
  if (complianceResults.isCompliant) {
    return {
      status: 'compliant',
      message: 'This product meets all SSIS compliance requirements!',
      icon: '✅'
    };
  } else {
    const failedCount = complianceResults.failedTests.length;
    const totalTests = complianceResults.passedTests.length + complianceResults.failedTests.length;
    return {
      status: 'non-compliant',
      message: `This product fails ${failedCount} of ${totalTests} SSIS requirements.`,
      icon: '❌'
    };
  }
};

// Helper function to format compliance details for display
export const formatComplianceDetails = (complianceResults) => {
  const allTests = [...complianceResults.passedTests, ...complianceResults.failedTests];
  
  return allTests.map(test => ({
    name: test.test.charAt(0).toUpperCase() + test.test.slice(1).replace(/([A-Z])/g, ' $1'),
    passed: test.passed,
    value: test.value,
    requirement: test.requirement,
    explanation: test.explanation,
    icon: test.passed ? '✅' : '❌'
  }));
};