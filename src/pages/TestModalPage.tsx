// src/pages/TestModalPage.tsx
import { useState } from 'react';
import ModalTab from '../components/ModalTab';
import { SKILL_INFO } from '../constants/skills';

const TestModalPage = () => {
  const [visible, setVisible] = useState(true);

  const skillKey = 'exercise'; // or try bumpercar,coffee,game,exercise,shotgun etc.
  const skill = SKILL_INFO[skillKey];

  return (
    <div>
      <h1>Test Modal Page</h1>
      <button onClick={() => setVisible(true)}>Show Modal</button>
      <ModalTab
        visible={visible}
        title={skill.name}
        description={skill.description}
        image={skill.image}
        skillName={skillKey}
        onOk={() => setVisible(false)}
      />
    </div>
  );
};

export default TestModalPage;
