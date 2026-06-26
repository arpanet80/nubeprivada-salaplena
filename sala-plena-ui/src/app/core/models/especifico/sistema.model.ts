export interface Sistema {
    id?: number;
    sistema: string;
    activo?: boolean;

    isEdit?: boolean;
}

export const sistemasColumns = [
    {
      key: 'id',
      type: 'number',
      label: 'ID',
      style: 'width:2%',
      required: true,
      disabled: true
    },
    {
      key: 'sistema',
      type: 'text',
      label: 'Sistema',
      style: 'width:20%',
      required: true,
      disabled: false
    },
    
    {
      key: 'isEdit',
      type: 'button',
      style: 'width:10%',
      label: 'Acciones',
    },
  
  ];
