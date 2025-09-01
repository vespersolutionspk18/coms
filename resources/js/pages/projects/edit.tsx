import React from 'react';
import ProjectForm from './form';

interface Props {
    project: any;
    firms?: any[];
    users?: any[];
    requirements?: any[];
}

export default function ProjectEdit({ project, firms, users, requirements }: Props) {
    // Requirements should already be in project.requirements, but we can also pass them separately
    return <ProjectForm project={project} firms={firms} users={users} />;
}