import React from 'react';
import { CategorySectionProps } from './types';
import { HousingDetailSection } from './HousingDetailSection';
import { StandardDetailSection } from './StandardDetailSection';

export function CategorySectionRegistry(props: CategorySectionProps) {
  switch (props.business.category) {
    case 'housing_rentals':
      return <HousingDetailSection {...props} />;
    
    // Extensible slot: Add future category templates here
    // case 'healthcare':
    //   return <HealthcareDetailSection {...props} />;
    // case 'food_dining':
    //   return <FoodDiningDetailSection {...props} />;

    default:
      return <StandardDetailSection {...props} />;
  }
}

export * from './types';
export * from './HousingDetailSection';
export * from './StandardDetailSection';
