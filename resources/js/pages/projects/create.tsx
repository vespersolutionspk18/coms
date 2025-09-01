import React from 'react';
import ProjectForm from './form';

interface Props {
    firms?: any[];
    users?: any[];
}

export default function ProjectCreate({ firms, users }: Props) {
    return <ProjectForm firms={firms} users={users} />;
}